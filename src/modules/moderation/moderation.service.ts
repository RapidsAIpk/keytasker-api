import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { VoteSubmissionDto } from './dto/vote-submission.dto';
import { FindPendingSubmissionsDto } from './dto/find-pending-submissions.dto';
import { UserRole, SubmissionStatus, VoteDecision } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get pending submissions for moderation (Moderators only)
   */
  async findPendingSubmissions(
    { page, limit, sortDto, filters }: FindPendingSubmissionsDto,
    req: any,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user can moderate
      if (!user.canModerate) {
        throw new ForbiddenException(
          'You must earn at least $25 to moderate submissions',
        );
      }

      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 200);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = {
        deletedAt: null,
        status: {
          in: [SubmissionStatus.PendingModeration, SubmissionStatus.UnderReview],
        },
      };

      // Exclude submissions the user has already voted on
      const userVotes = await this.prisma.moderationVote.findMany({
        where: { moderatorId: req.user.id },
        select: { submissionId: true },
      });
      const votedSubmissionIds = userVotes.map((v) => v.submissionId);

      if (votedSubmissionIds.length > 0) {
        where.id = { notIn: votedSubmissionIds };
      }

      // Apply filters
      if (filters) {
        if (filters.bonusOnly !== undefined) {
          where.isBonusSubmission = filters.bonusOnly;
        }
      }

      // Add task filters if needed
      if (filters?.taskType) {
        where.task = {
          taskType: filters.taskType,
        };
      }

      let totalCount = await this.prisma.taskSubmission.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['submittedAt'] = SortEnum.Asc; // Oldest first

      const submissions = await this.prisma.taskSubmission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          task: {
            select: {
              id: true,
              taskType: true,
              recipient: true,
              topicInstruction: true,
              detailedInstructions: true,
              basePayment: true,
              bonusPayment: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              rejectionRate: true,
            },
          },
          _count: {
            select: {
              moderationVotes: true,
            },
          },
        },
      });

      return {
        totalCount,
        submissions,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vote on a submission (Moderators only)
   */
  async voteOnSubmission(voteDto: VoteSubmissionDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user can moderate
      if (!user.canModerate) {
        throw new ForbiddenException(
          'You must earn at least $25 to moderate submissions',
        );
      }

      // Get submission
      const submission = await this.prisma.taskSubmission.findUnique({
        where: { id: voteDto.submissionId },
        include: {
          task: true,
          user: true,
        },
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // Check if submission is pending moderation
      if (
        submission.status !== SubmissionStatus.PendingModeration &&
        submission.status !== SubmissionStatus.UnderReview
      ) {
        throw new BadRequestException(
          'This submission is not pending moderation',
        );
      }

      // Check if user has already voted
      const existingVote = await this.prisma.moderationVote.findUnique({
        where: {
          submissionId_moderatorId: {
            submissionId: voteDto.submissionId,
            moderatorId: userId,
          },
        },
      });

      if (existingVote) {
        throw new BadRequestException('You have already voted on this submission');
      }

      // Check if user is voting on their own submission
      if (submission.userId === userId) {
        throw new BadRequestException('You cannot moderate your own submission');
      }

      // Get platform settings
      const settings = await this.prisma.platformSettings.findFirst();
      const minVotes = settings?.minVotesRequired || 3;
      const maxVotes = settings?.maxVotesRequired || 5;
      const moderationFee = settings?.moderationFeePerVote || 0.05;

      // Create vote in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Create the vote
        await tx.moderationVote.create({
          data: {
            submissionId: voteDto.submissionId,
            moderatorId: userId,
            decision: voteDto.decision,
            comment: voteDto.comment,
          },
        });

        // Update submission vote counts
        const updateData: any = {
          totalVotes: { increment: 1 },
        };

        if (voteDto.decision === VoteDecision.Approve) {
          updateData.approveVotes = { increment: 1 };
        } else {
          updateData.rejectVotes = { increment: 1 };
        }

        await tx.taskSubmission.update({
          where: { id: voteDto.submissionId },
          data: updateData,
        });

        // Update moderator stats
        await tx.user.update({
          where: { id: userId },
          data: {
            moderatorVotes: { increment: 1 },
            pendingEarnings: { increment: moderationFee },
            totalEarnings: { increment: moderationFee },
          },
        });
      });

      // Get updated submission with votes
      const updatedSubmission = await this.prisma.taskSubmission.findUnique({
        where: { id: voteDto.submissionId },
        include: {
          moderationVotes: true,
        },
      });

      // Check if we need to finalize the submission
      await this.checkAndFinalizeSubmission(
        voteDto.submissionId,
        minVotes,
        maxVotes,
      );

      return {
        message: 'Vote submitted successfully',
        moderationFee,
        submission: updatedSubmission,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if submission should be finalized based on votes
   */
  private async checkAndFinalizeSubmission(
    submissionId: string,
    minVotes: number,
    maxVotes: number,
  ) {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        moderationVotes: true,
        task: true,
        user: true,
      },
    });

    if (!submission) return;

    const totalVotes = submission.totalVotes;
    const approveVotes = submission.approveVotes;
    const rejectVotes = submission.rejectVotes;

    // Check if we have minimum votes
    if (totalVotes < minVotes) return;

    // Check for clear majority
    const hasApprovalMajority = approveVotes > rejectVotes && approveVotes >= Math.ceil(totalVotes / 2);
    const hasRejectionMajority = rejectVotes > approveVotes && rejectVotes >= Math.ceil(totalVotes / 2);

    // If we have a clear majority, finalize
    if (hasApprovalMajority || hasRejectionMajority) {
      await this.finalizeSubmission(submissionId, hasApprovalMajority);
      return;
    }

    // If votes are tied and we haven't reached max votes, mark as under review
    if (approveVotes === rejectVotes && totalVotes < maxVotes) {
      await this.prisma.taskSubmission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.UnderReview,
          needsAdditionalVotes: true,
        },
      });
      return;
    }

    // If we've reached max votes, finalize based on majority
    if (totalVotes >= maxVotes) {
      await this.finalizeSubmission(submissionId, approveVotes > rejectVotes);
    }
  }

  /**
   * Finalize a submission (approve or reject)
   */
  private async finalizeSubmission(submissionId: string, isApproved: boolean) {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: {
        task: true,
        user: true,
        moderationVotes: true,
      },
    });

    if (!submission) return;

    await this.prisma.$transaction(async (tx) => {
      let payment = 0;
      let baseAwarded = false;
      let bonusAwarded = false;

      if (isApproved) {
        // Calculate payment
        payment = submission.task.basePayment;
        baseAwarded = true;

        // Add bonus if applicable
        if (submission.isBonusSubmission && submission.bonusScreenshotUrl) {
          payment += submission.task.bonusPayment;
          bonusAwarded = true;
        }

        // Update user earnings
        await tx.user.update({
          where: { id: submission.userId },
          data: {
            pendingEarnings: { increment: payment },
            totalEarnings: { increment: payment },
            tasksCompleted: { increment: 1 },
          },
        });

        // Update task stats
        await tx.task.update({
          where: { id: submission.taskId },
          data: {
            approvedCount: { increment: 1 },
          },
        });

        // Create approval notification
        await tx.notification.create({
          data: {
            userId: submission.userId,
            type: 'TaskApproved',
            title: 'Submission Approved!',
            message: `Your submission was approved! You earned $${payment.toFixed(2)}`,
            link: `/submissions/${submission.id}`,
          },
        });
      } else {
        // Rejected
        await tx.user.update({
          where: { id: submission.userId },
          data: {
            tasksRejected: { increment: 1 },
          },
        });

        // Update task stats
        await tx.task.update({
          where: { id: submission.taskId },
          data: {
            rejectedCount: { increment: 1 },
          },
        });

        // Create rejection notification
        await tx.notification.create({
          data: {
            userId: submission.userId,
            type: 'TaskRejected',
            title: 'Submission Rejected',
            message:
              'Your submission was rejected by moderators. You can appeal this decision.',
            link: `/submissions/${submission.id}`,
          },
        });

        // Check if user needs suspension
        await this.checkAndSuspendUser(submission.userId, tx);
      }

      // Update submission status
      await tx.taskSubmission.update({
        where: { id: submissionId },
        data: {
          status: isApproved
            ? SubmissionStatus.Approved
            : SubmissionStatus.Rejected,
          basePaymentAwarded: baseAwarded,
          bonusPaymentAwarded: bonusAwarded,
          totalPayment: payment,
          finalizedAt: new Date(),
        },
      });

      // Update moderator accuracy for all voters
      await this.updateModeratorAccuracy(submissionId, isApproved, tx);

      // Calculate and update task approval rate
      const taskStats = await tx.taskSubmission.groupBy({
        by: ['status'],
        where: { taskId: submission.taskId },
        _count: true,
      });

      const approved =
        taskStats.find((s) => s.status === SubmissionStatus.Approved)?._count || 0;
      const rejected =
        taskStats.find((s) => s.status === SubmissionStatus.Rejected)?._count || 0;
      const total = approved + rejected;

      if (total > 0) {
        await tx.task.update({
          where: { id: submission.taskId },
          data: {
            approvalRate: (approved / total) * 100,
          },
        });
      }
    });
  }

  /**
   * Update moderator accuracy based on final decision
   */
  private async updateModeratorAccuracy(
    submissionId: string,
    finalDecisionIsApproved: boolean,
    tx: any,
  ) {
    const votes = await tx.moderationVote.findMany({
      where: { submissionId },
    });

    const settings = await tx.platformSettings.findFirst();
    const accuracyThreshold = settings?.moderatorAccuracyMin || 0.75;

    for (const vote of votes) {
      const voteWasCorrect =
        (finalDecisionIsApproved && vote.decision === VoteDecision.Approve) ||
        (!finalDecisionIsApproved && vote.decision === VoteDecision.Reject);

      // Update vote record
      await tx.moderationVote.update({
        where: { id: vote.id },
        data: { wasCorrect: voteWasCorrect },
      });

      // Get moderator's voting history
      const moderatorVotes = await tx.moderationVote.findMany({
        where: {
          moderatorId: vote.moderatorId,
          wasCorrect: { not: null },
        },
      });

      const totalVotes = moderatorVotes.length;
      const correctVotes = moderatorVotes.filter((v) => v.wasCorrect).length;
      const accuracy = totalVotes > 0 ? correctVotes / totalVotes : 0;

      // Update moderator accuracy
      await tx.user.update({
        where: { id: vote.moderatorId },
        data: { moderatorAccuracy: accuracy },
      });

      // Check if moderator should be suspended from moderation
      if (totalVotes >= 10 && accuracy < accuracyThreshold) {
        await tx.user.update({
          where: { id: vote.moderatorId },
          data: {
            canModerate: false,
            warningsCount: { increment: 1 },
          },
        });

        // Create suspension notification
        await tx.notification.create({
          data: {
            userId: vote.moderatorId,
            type: 'SuspensionWarning',
            title: 'Moderation Access Suspended',
            message: `Your moderation accuracy (${(accuracy * 100).toFixed(2)}%) is below the required threshold. Moderation access has been revoked.`,
          },
        });
      }
    }
  }

  /**
   * Check if user should be suspended based on rejection rate
   */
  private async checkAndSuspendUser(userId: string, tx: any) {
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const totalTasks = user.tasksCompleted + user.tasksRejected;
    if (totalTasks === 0) return;

    const rejectionRate = user.tasksRejected / totalTasks;

    const settings = await tx.platformSettings.findFirst();
    const threshold = settings?.suspensionThreshold || 0.25;

    if (rejectionRate > threshold) {
      const suspensionEndDate = new Date();
      suspensionEndDate.setMonth(suspensionEndDate.getMonth() + 1);

      await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'Suspended',
          suspensionEndDate,
          suspensionReason: `High rejection rate: ${(rejectionRate * 100).toFixed(2)}%`,
          warningsCount: { increment: 1 },
        },
      });

      await tx.suspensionHistory.create({
        data: {
          userId,
          reason: `High rejection rate: ${(rejectionRate * 100).toFixed(2)}%`,
          suspendedBy: 'SYSTEM',
          suspensionType: 'Auto',
          endsAt: suspensionEndDate,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          type: 'SuspensionNotice',
          title: 'Account Suspended',
          message: `Your account has been suspended due to a high rejection rate (${(rejectionRate * 100).toFixed(2)}%). Suspension ends on ${suspensionEndDate.toLocaleDateString()}.`,
        },
      });
    }
  }

  /**
   * Get moderation statistics (Admin/Manager only)
   */
  async getStats(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view moderation statistics',
        );
      }

      const [
        totalModerators,
        activeModerators,
        totalVotes,
        pendingSubmissions,
        underReviewSubmissions,
      ] = await Promise.all([
        this.prisma.user.count({ where: { canModerate: true } }),
        this.prisma.user.count({
          where: {
            canModerate: true,
            moderatorVotes: { gt: 0 },
          },
        }),
        this.prisma.moderationVote.count(),
        this.prisma.taskSubmission.count({
          where: { status: SubmissionStatus.PendingModeration },
        }),
        this.prisma.taskSubmission.count({
          where: { status: SubmissionStatus.UnderReview },
        }),
      ]);

      // Get average votes per submission
      const submissions = await this.prisma.taskSubmission.findMany({
        where: {
          status: {
            in: [SubmissionStatus.Approved, SubmissionStatus.Rejected],
          },
        },
        select: { totalVotes: true },
      });

      const averageVotesPerSubmission =
        submissions.length > 0
          ? submissions.reduce((sum, s) => sum + s.totalVotes, 0) /
            submissions.length
          : 0;

      return {
        totalModerators,
        activeModerators,
        totalVotes,
        pendingSubmissions,
        underReviewSubmissions,
        averageVotesPerSubmission: Number(averageVotesPerSubmission.toFixed(2)),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get my moderation history
   */
  async getMyModerationHistory(userId: string, page: number = 1, limit: number = 20) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.canModerate) {
        throw new ForbiddenException('You do not have moderation access');
      }

      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const [votes, totalCount] = await Promise.all([
        this.prisma.moderationVote.findMany({
          where: { moderatorId: userId },
          skip,
          take: pageSize,
          orderBy: { votedAt: 'desc' },
          include: {
            submission: {
              select: {
                id: true,
                status: true,
                totalVotes: true,
                approveVotes: true,
                rejectVotes: true,
                task: {
                  select: {
                    id: true,
                    taskType: true,
                    topicInstruction: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.moderationVote.count({
          where: { moderatorId: userId },
        }),
      ]);

      return {
        votes,
        totalCount,
        page: pageNumber,
        limit: pageSize,
        moderatorStats: {
          totalVotes: user.moderatorVotes,
          accuracy: user.moderatorAccuracy,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
