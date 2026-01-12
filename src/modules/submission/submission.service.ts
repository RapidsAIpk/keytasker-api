import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { BonusSubmissionDto } from './dto/bonus-submission.dto';
import { SubmissionAppealDto } from './dto/submission-appeal.dto';
import { FindAllSubmissionsDto } from './dto/find-all-submissions.dto';
import { SubmissionStatus, UserRole, Prisma } from '@prisma/client';
import { SortEnum } from '@config/constants';
import { MediaService } from '../media/media.service';
@Injectable()
export class SubmissionService {
  constructor(private prisma: PrismaService,private readonly mediaService: MediaService, // Add this
    ) {}

  /**
   * Create a new task submission
   */
async create(
  createSubmissionDto: CreateSubmissionDto, 
  screenshot: Express.Multer.File,
  userId: string
) {
  // console.log('=== SUBMISSION SERVICE START ===');
  // console.log('DTO in service:', createSubmissionDto);
  // console.log('Screenshot in service:', screenshot ? 'FILE EXISTS' : 'NO FILE');
  // console.log('User ID in service:', userId);
  
  try {
    // Validate screenshot is provided
    if (!screenshot) {
      console.log('ERROR: Screenshot is missing');
      throw new BadRequestException('Screenshot file is required');
    }

    // console.log('Uploading screenshot to media service...');
    // Upload screenshot first
    const uploadedMedia = await this.mediaService.create(screenshot);
    // console.log('Screenshot uploaded:', uploadedMedia);
    const screenshotUrl = uploadedMedia.fileUrl;

  // Convert aiDetectionAnswer string to boolean
const aiDetectionAnswer = createSubmissionDto.aiDetectionAnswer === 'true';
// console.log('AI Detection Answer converted:', aiDetectionAnswer, typeof aiDetectionAnswer);
//     console.log('Getting user...');
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('ERROR: User not found');
      throw new NotFoundException('User not found');
    }
    // console.log('User found:', user.id);

    // Check if user is suspended
    if (
      user.accountStatus === 'Suspended' ||
      user.accountStatus === 'Banned'
    ) {
      // console.log('ERROR: User is suspended/banned');
      throw new ForbiddenException('Your account is suspended or banned');
    }

    // console.log('Getting task...');
    // Get task
    const task = await this.prisma.task.findUnique({
      where: { id: createSubmissionDto.taskId },
      include: { campaign: true },
    });

    if (!task) {
      // console.log('ERROR: Task not found');
      throw new NotFoundException('Task not found');
    }
    // console.log('Task found:', task.id);

    // Check if task is active
    if (task.status !== 'Active') {
      // console.log('ERROR: Task is not active, status:', task.status);
      throw new BadRequestException('This task is not currently active');
    }

    // Check if task has capacity
    if (task.completedCount >= task.totalQuantity) {
      // console.log('ERROR: Task capacity reached');
      throw new BadRequestException(
        'This task has reached its completion limit',
      );
    }

    // console.log('Checking existing submission...');
    // Check if user has already submitted this task
    const existingSubmission = await this.prisma.taskSubmission.findFirst({
      where: {
        userId,
        taskId: createSubmissionDto.taskId,
      },
    });

    if (existingSubmission) {
      // console.log('ERROR: User already submitted this task');
      throw new BadRequestException('You have already submitted this task');
    }

    // console.log('Checking campaign interaction...');
    // Check if user has interacted with this campaign before
    const campaignInteraction =
      await this.prisma.userCampaignInteraction.findUnique({
        where: {
          userId_campaignId: {
            userId,
            campaignId: task.campaignId,
          },
        },
      });

    if (campaignInteraction) {
      // console.log('ERROR: User already interacted with campaign');
      throw new ForbiddenException(
        'You cannot submit tasks from a campaign you have already interacted with',
      );
    }

    // console.log('Checking reservation...');
    // Check if user has an active reservation for this task
    const reservation = await this.prisma.taskReservation.findFirst({
      where: {
        userId,
        taskId: createSubmissionDto.taskId,
        status: { in: ['Reserved', 'InProgress'] },
      },
    });
    // console.log('Reservation found:', reservation ? 'YES' : 'NO');

    // console.log('Starting transaction...');
    // Create submission and campaign interaction in a transaction
    const submission = await this.prisma.$transaction(async (tx) => {
      // console.log('Creating submission...');
      // Create the submission
      const newSubmission = await tx.taskSubmission.create({
        data: {
          taskId: createSubmissionDto.taskId,
          userId,
          screenshotUrl: screenshotUrl,
          aiDetectionAnswer: aiDetectionAnswer, // Use converted boolean
          reasonText: createSubmissionDto.reasonText,
          status: 'PendingModeration',
          totalPayment: 0,
        },
        include: {
          task: {
            select: {
              id: true,
              taskType: true,
              topicInstruction: true,
              basePayment: true,
              bonusPayment: true,
            },
          },
        },
      });
      console.log('Submission created:', newSubmission.id);

      console.log('Creating campaign interaction...');
      // Create campaign interaction record
      await tx.userCampaignInteraction.create({
        data: {
          userId,
          campaignId: task.campaignId,
        },
      });

      // console.log('Updating task completed count...');
      // Increment task completed count
      await tx.task.update({
        where: { id: createSubmissionDto.taskId },
        data: {
          completedCount: {
            increment: 1,
          },
        },
      });

      // Update reservation if exists
      if (reservation) {
        // console.log('Updating reservation...');
        await tx.taskReservation.update({
          where: { id: reservation.id },
          data: {
            status: 'Completed',
            completedAt: new Date(),
          },
        });
      }

      return newSubmission;
    });
    // console.log('Transaction completed');

    // console.log('Creating notification...');
    // Create notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'TaskApproved',
        title: 'Submission Received',
        message: 'Your task submission is now pending moderation.',
        link: `/submissions/${submission.id}`,
      },
    });
    console.log('Notification created');

    console.log('=== SUBMISSION SERVICE SUCCESS ===');
    return {
      message: 'Task submission created successfully',
      submission,
    };
  } catch (error) {
    console.log('=== SUBMISSION SERVICE ERROR ===');
    console.error('Error details:', error);
    throw error;
  }
}
  /**
   * Submit bonus screenshot for continued conversation
   */
/**
 * Submit bonus screenshot for continued conversation
 */
// Only showing the submitBonus method that needs to be updated
// Replace the existing submitBonus method (lines 236-310) with this:

async submitBonus(
  submissionId: string,
  bonusScreenshot: Express.Multer.File,
  userId: string
) {
  try {
    // Validate screenshot is provided
    if (!bonusScreenshot) {
      throw new BadRequestException('Bonus screenshot file is required');
    }

    // Upload screenshot first
    const uploadedMedia = await this.mediaService.create(bonusScreenshot);
    const bonusScreenshotUrl = uploadedMedia.fileUrl;

    // Get submission
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { id: submissionId },
      include: { task: true },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Verify submission belongs to user
    if (submission.userId !== userId) {
      throw new ForbiddenException(
        'This submission does not belong to you',
      );
    }

    // Check if base submission was approved and base payment awarded
    if (submission.status !== SubmissionStatus.Approved || !submission.basePaymentAwarded) {
      throw new BadRequestException(
        'Base submission must be approved before submitting bonus',
      );
    }

    // Check if bonus already submitted
    if (submission.bonusScreenshotUrl) {
      throw new BadRequestException(
        'Bonus submission already exists for this task',
      );
    }

    // Update submission with bonus
    const updatedSubmission = await this.prisma.taskSubmission.update({
      where: { id: submissionId },
      data: {
        bonusScreenshotUrl: bonusScreenshotUrl,
        bonusSubmittedAt: new Date(),
        status: SubmissionStatus.PendingModeration,
        needsAdditionalVotes: true,
      },
    });

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'TaskApproved',
        title: 'Bonus Submission Received',
        message: `Your bonus submission is now pending moderation. It will be reviewed by moderators for an additional $${submission.task.bonusPayment.toFixed(2)}.`,
        link: `/submissions/${submission.id}`,
      },
    });

    return {
      message: 'Bonus submission added successfully. It will be reviewed by moderators.',
      submission: updatedSubmission,
    };
  } catch (error) {
    throw error;
  }
}

  /**
   * Get user's submissions with filtering and sorting
   */
async findMySubmissions({ page, sortDto }: FindAllSubmissionsDto, req) {
    try {
      let totalCount = await this.prisma.taskSubmission.count({
        where: { userId: req.user.id, deletedAt: null },
      });

      let orderBy: any = {};

      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['submittedAt'] = SortEnum.Desc;

      const submissions = await this.prisma.taskSubmission.findMany({
        where: { userId: req.user.id, deletedAt: null },
        skip: page ? (page - 1) * 10 : 0,
        take: page ? 10 : undefined,
        orderBy,
        include: {
          task: {
            select: {
              id: true,
              taskType: true,
              topicInstruction: true,
              basePayment: true,
              bonusPayment: true,
            },
          },
        },
      });

      return {
        totalCount,
        submissions,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all submissions with filtering and sorting (Admin/Manager only)
   */
async findAllSubmissions({ page, limit, sortDto, filters }: FindAllSubmissionsDto, req) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Manager)) {
        throw new ForbiddenException('Only admins and managers can view all submissions');
      }

      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 200);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = { deletedAt: null };

      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.userId) {
          where.userId = filters.userId;
        }
        if (filters.taskId) {
          where.taskId = filters.taskId;
        }
      }

      let totalCount = await this.prisma.taskSubmission.count({ where });

      let orderBy: any = {};

      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['submittedAt'] = SortEnum.Desc;

      const submissions = await this.prisma.taskSubmission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              taskType: true,
              topicInstruction: true,
              basePayment: true,
              bonusPayment: true,
            },
          },
          moderationVotes: {
            include: {
              moderator: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
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
   * Get a single submission by ID
   */
  async findOne(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const submission = await this.prisma.taskSubmission.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
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
          moderationVotes:
            user.role === UserRole.Admin || user.role === UserRole.Manager
              ? {
                  include: {
                    moderator: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                }
              : false,
        },
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // Regular users can only view their own submissions
      if (
        user.role === UserRole.User &&
        submission.userId !== userId
      ) {
        throw new ForbiddenException(
          'You can only view your own submissions',
        );
      }

      return submission;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit an appeal for a rejected submission
   */
  async submitAppeal(appealDto: SubmissionAppealDto, userId: string) {
    try {
      const submission = await this.prisma.taskSubmission.findUnique({
        where: { id: appealDto.submissionId },
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      if (submission.userId !== userId) {
        throw new ForbiddenException(
          'This submission does not belong to you',
        );
      }

      if (submission.status !== SubmissionStatus.Rejected) {
        throw new BadRequestException(
          'Only rejected submissions can be appealed',
        );
      }

      // Update submission status to under review
      await this.prisma.taskSubmission.update({
        where: { id: appealDto.submissionId },
        data: {
          status: SubmissionStatus.UnderReview,
        },
      });

      // Create activity log for admin review
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskEdited',
          description: `Appeal submitted for rejected submission`,
          metadata: {
            submissionId: appealDto.submissionId,
            appealReason: appealDto.appealReason,
          },
        },
      });

      // Create notification for admins
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.Admin },
      });

      for (const admin of admins) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SupportResponse',
            title: 'New Submission Appeal',
            message: `A user has appealed a rejected submission. Review required.`,
            link: `/submissions/${appealDto.submissionId}`,
          },
        });
      }

      return {
        message:
          'Appeal submitted successfully. An admin will review your submission.',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate and finalize submission payment after moderation
   * This is called by the moderation service
   */
  async finalizeSubmission(submissionId: string, isApproved: boolean) {
    try {
      const submission = await this.prisma.taskSubmission.findUnique({
        where: { id: submissionId },
        include: { task: true, user: true },
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      let payment = 0;
      let baseAwarded = false;
      let bonusAwarded = false;

      if (isApproved) {
        // Award base payment
        payment += submission.task.basePayment;
        baseAwarded = true;

        // Award bonus if applicable
        if (submission.isBonusSubmission && submission.bonusScreenshotUrl) {
          payment += submission.task.bonusPayment;
          bonusAwarded = true;
        }

        // Update user earnings
        await this.prisma.user.update({
          where: { id: submission.userId },
          data: {
            pendingEarnings: {
              increment: payment,
            },
            totalEarnings: {
              increment: payment,
            },
            tasksCompleted: {
              increment: 1,
            },
          },
        });

        // Update task approval count
        await this.prisma.task.update({
          where: { id: submission.taskId },
          data: {
            approvedCount: {
              increment: 1,
            },
          },
        });

        // Create notification
        await this.prisma.notification.create({
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
        await this.prisma.user.update({
          where: { id: submission.userId },
          data: {
            tasksRejected: {
              increment: 1,
            },
          },
        });

        // Update task rejection count
        await this.prisma.task.update({
          where: { id: submission.taskId },
          data: {
            rejectedCount: {
              increment: 1,
            },
          },
        });

        // Create notification
        await this.prisma.notification.create({
          data: {
            userId: submission.userId,
            type: 'TaskRejected',
            title: 'Submission Rejected',
            message:
              'Your submission was rejected by moderators. Please review the feedback.',
            link: `/submissions/${submission.id}`,
          },
        });

        // Check if user needs to be suspended
        await this.checkAndSuspendUser(submission.userId);
      }

      // Update submission
      await this.prisma.taskSubmission.update({
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

      // Calculate and update task approval rate
      const taskStats = await this.prisma.taskSubmission.groupBy({
        by: ['status'],
        where: { taskId: submission.taskId },
        _count: true,
      });

      const approved =
        taskStats.find((s) => s.status === SubmissionStatus.Approved)?._count ||
        0;
      const rejected =
        taskStats.find((s) => s.status === SubmissionStatus.Rejected)?._count ||
        0;
      const total = approved + rejected;

      if (total > 0) {
        await this.prisma.task.update({
          where: { id: submission.taskId },
          data: {
            approvalRate: (approved / total) * 100,
          },
        });
      }

      return {
        message: 'Submission finalized successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user should be suspended based on rejection rate
   */
  private async checkAndSuspendUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const totalTasks = user.tasksCompleted + user.tasksRejected;
    if (totalTasks === 0) return;

    const rejectionRate = user.tasksRejected / totalTasks;

    // Get suspension threshold from settings (default 0.25 = 25%)
    const settings = await this.prisma.platformSettings.findFirst();
    const threshold = settings?.suspensionThreshold || 0.25;

    if (rejectionRate > threshold) {
      // Suspend user for 1 month
      const suspensionEndDate = new Date();
      suspensionEndDate.setMonth(suspensionEndDate.getMonth() + 1);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'Suspended',
          suspensionEndDate,
          suspensionReason: `High rejection rate: ${(rejectionRate * 100).toFixed(2)}%`,
          warningsCount: {
            increment: 1,
          },
        },
      });

      // Create suspension history
      await this.prisma.suspensionHistory.create({
        data: {
          userId,
          reason: `High rejection rate: ${(rejectionRate * 100).toFixed(2)}%`,
          suspendedBy: 'SYSTEM',
          suspensionType: 'Auto',
          endsAt: suspensionEndDate,
        },
      });

      // Create notification
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'SuspensionNotice',
          title: 'Account Suspended',
          message: `Your account has been suspended due to a high rejection rate (${(rejectionRate * 100).toFixed(2)}%). Suspension ends on ${suspensionEndDate.toLocaleDateString()}.`,
        },
      });
    } else if (rejectionRate > threshold * 0.8) {
      // Warning (at 80% of threshold)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          warningsCount: {
            increment: 1,
          },
        },
      });

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'SuspensionWarning',
          title: 'High Rejection Rate Warning',
          message: `Your rejection rate is ${(rejectionRate * 100).toFixed(2)}%. Please improve your submission quality to avoid suspension.`,
        },
      });
    }
  }

  /**
   * Get submission statistics (Admin/Manager only)
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
          'Only admins and managers can view submission statistics',
        );
      }

      const [
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        underReviewSubmissions,
        bonusSubmissions,
      ] = await Promise.all([
        this.prisma.taskSubmission.count(),
        this.prisma.taskSubmission.count({
          where: { status: SubmissionStatus.PendingModeration },
        }),
        this.prisma.taskSubmission.count({
          where: { status: SubmissionStatus.Approved },
        }),
        this.prisma.taskSubmission.count({
          where: { status: SubmissionStatus.Rejected },
        }),
        this.prisma.taskSubmission.count({
          where: { status: SubmissionStatus.UnderReview },
        }),
        this.prisma.taskSubmission.count({
          where: { isBonusSubmission: true },
        }),
      ]);

      const approvalRate =
        totalSubmissions > 0
          ? (approvedSubmissions / totalSubmissions) * 100
          : 0;

      return {
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        underReviewSubmissions,
        bonusSubmissions,
        approvalRate: Number(approvalRate.toFixed(2)),
      };
    } catch (error) {
      throw error;
    }
  }
}