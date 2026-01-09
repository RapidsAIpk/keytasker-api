import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { SuspendUserDto, ModeratorAccessDto } from './dto/suspend-user.dto';
import { UserRole, AccountStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Suspend or ban a user (Admin only)
   */
  async suspendUser(suspendDto: SuspendUserDto, adminId: string) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can suspend users');
      }

      const targetUser = await this.prisma.user.findUnique({
        where: { id: suspendDto.userId },
      });

      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      // Prevent admins from suspending other admins
      if (targetUser.role === UserRole.Admin) {
        throw new BadRequestException('Cannot suspend admin users');
      }

      const suspensionEndDate = suspendDto.suspensionEndDate
        ? new Date(suspendDto.suspensionEndDate)
        : (() => {
            const date = new Date();
            date.setMonth(date.getMonth() + 1);
            return date;
          })();

      const updatedUser = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: suspendDto.userId },
          data: {
            accountStatus: suspendDto.status,
            suspensionReason: suspendDto.reason,
            suspensionEndDate:
              suspendDto.status === AccountStatus.Suspended
                ? suspensionEndDate
                : null,
          },
        });

        // Create suspension history
        if (suspendDto.status === AccountStatus.Suspended || suspendDto.status === AccountStatus.Banned) {
          await tx.suspensionHistory.create({
            data: {
              userId: suspendDto.userId,
              reason: suspendDto.reason,
              suspendedBy: adminId,
              suspensionType: 'Manual',
              endsAt: suspensionEndDate,
            },
          });
        }

        // Create notification
        const notificationMessage =
          suspendDto.status === AccountStatus.Suspended
            ? `Your account has been suspended until ${suspensionEndDate.toLocaleDateString()}. Reason: ${suspendDto.reason}`
            : suspendDto.status === AccountStatus.Banned
              ? `Your account has been permanently banned. Reason: ${suspendDto.reason}`
              : `Your account status has been updated to ${suspendDto.status}.`;

        await tx.notification.create({
          data: {
            userId: suspendDto.userId,
            type: suspendDto.status === AccountStatus.Active ? 'ModeratorAccess' : 'SuspensionNotice',
            title: 'Account Status Updated',
            message: notificationMessage,
          },
        });

        // Log activity
        const activityType =
          suspendDto.status === AccountStatus.Suspended
            ? 'UserSuspended'
            : suspendDto.status === AccountStatus.Banned
              ? 'UserBanned'
              : 'UserUnbanned';

        await tx.activityLog.create({
          data: {
            userId: adminId,
            activityType,
            description: `${activityType.replace(/([A-Z])/g, ' $1').trim()}: ${targetUser.fullName}`,
            metadata: {
              targetUserId: suspendDto.userId,
              reason: suspendDto.reason,
              status: suspendDto.status,
            },
          },
        });

        return updated;
      });

      return {
        message: 'User status updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Grant or revoke moderator access (Admin only)
   */
  async manageModeratorAccess(accessDto: ModeratorAccessDto, adminId: string) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== UserRole.Admin) {
        throw new ForbiddenException(
          'Only admins can manage moderator access',
        );
      }

      const targetUser = await this.prisma.user.findUnique({
        where: { id: accessDto.userId },
      });

      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: accessDto.userId },
          data: {
            canModerate: accessDto.canModerate,
            moderatorSince: accessDto.canModerate ? new Date() : null,
          },
        });

        // Create notification
        await tx.notification.create({
          data: {
            userId: accessDto.userId,
            type: 'ModeratorAccess',
            title: accessDto.canModerate
              ? 'Moderator Access Granted'
              : 'Moderator Access Revoked',
            message: accessDto.canModerate
              ? 'You have been granted moderator access! You can now review submissions and earn moderation fees.'
              : 'Your moderator access has been revoked.',
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: adminId,
            activityType: 'ModeratorFlagged',
            description: `${accessDto.canModerate ? 'Granted' : 'Revoked'} moderator access for ${targetUser.fullName}`,
            metadata: {
              targetUserId: accessDto.userId,
              canModerate: accessDto.canModerate,
              reason: accessDto.reason,
            },
          },
        });

        return updated;
      });

      return {
        message: `Moderator access ${accessDto.canModerate ? 'granted' : 'revoked'} successfully`,
        user: updatedUser,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all suspension history (Admin/Manager only)
   */
  async getSuspensionHistory(userId: string, page: number = 1, limit: number = 20) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view suspension history',
        );
      }

      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const [suspensions, totalCount] = await Promise.all([
        this.prisma.suspensionHistory.findMany({
          skip,
          take: pageSize,
          orderBy: { suspendedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.suspensionHistory.count(),
      ]);

      return {
        suspensions,
        totalCount,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get flagged users (Admin/Manager only)
   */
  async getFlaggedUsers(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view flagged users',
        );
      }

      // Users with high rejection rates
      const highRejectionUsers = await this.prisma.user.findMany({
        where: {
          role: UserRole.User,
          rejectionRate: { gt: 0.2 }, // Over 20% rejection rate
        },
        orderBy: { rejectionRate: 'desc' },
        take: 20,
        select: {
          id: true,
          fullName: true,
          email: true,
          totalEarnings: true,
          tasksCompleted: true,
          tasksRejected: true,
          rejectionRate: true,
          accountStatus: true,
        },
      });

      // Users with low moderator accuracy
      const lowAccuracyModerators = await this.prisma.user.findMany({
        where: {
          canModerate: true,
          moderatorAccuracy: { lt: 0.75 }, // Below 75% accuracy
          moderatorVotes: { gt: 10 }, // At least 10 votes
        },
        orderBy: { moderatorAccuracy: 'asc' },
        take: 20,
        select: {
          id: true,
          fullName: true,
          email: true,
          moderatorVotes: true,
          moderatorAccuracy: true,
          canModerate: true,
        },
      });

      // Suspicious payments
      const suspiciousPayments = await this.prisma.payment.findMany({
        where: {
          flaggedAsSuspicious: true,
          status: 'Pending',
        },
        orderBy: { amount: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return {
        highRejectionUsers,
        lowAccuracyModerators,
        suspiciousPayments,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Review suspension appeal (Admin/Manager only)
   */
  async reviewAppeal(
    suspensionId: string,
    approved: boolean,
    reviewNotes: string,
    userId: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can review appeals',
        );
      }

      const suspension = await this.prisma.suspensionHistory.findUnique({
        where: { id: suspensionId },
        include: { user: true },
      });

      if (!suspension) {
        throw new NotFoundException('Suspension record not found');
      }

      if (!suspension.appealSubmitted) {
        throw new BadRequestException('No appeal has been submitted for this suspension');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Update suspension record
        await tx.suspensionHistory.update({
          where: { id: suspensionId },
          data: {
            appealApproved: approved,
            appealReviewedBy: userId,
            appealReviewedAt: new Date(),
          },
        });

        // If appeal is approved, reactivate user
        if (approved) {
          await tx.user.update({
            where: { id: suspension.userId },
            data: {
              accountStatus: AccountStatus.Active,
              suspensionEndDate: null,
              suspensionReason: null,
            },
          });
        }

        // Create notification
        await tx.notification.create({
          data: {
            userId: suspension.userId,
            type: 'SuspensionNotice',
            title: 'Appeal Reviewed',
            message: approved
              ? `Your suspension appeal has been approved. Your account is now active. ${reviewNotes}`
              : `Your suspension appeal has been denied. ${reviewNotes}`,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId,
            activityType: 'UserUnbanned',
            description: `Reviewed appeal for ${suspension.user.fullName}: ${approved ? 'Approved' : 'Denied'}`,
            metadata: {
              suspensionId,
              approved,
              reviewNotes,
            },
          },
        });
      });

      return {
        message: `Appeal ${approved ? 'approved' : 'denied'} successfully`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-upgrade users to moderators based on earnings threshold
   */
  async autoUpgradeModerators() {
    try {
      const settings = await this.prisma.platformSettings.findFirst();
      const threshold = settings?.moderatorMinimumEarnings || 25;

      const eligibleUsers = await this.prisma.user.findMany({
        where: {
          role: UserRole.User,
          totalEarnings: { gte: threshold },
          canModerate: false,
          accountStatus: AccountStatus.Active,
        },
      });

      for (const user of eligibleUsers) {
        await this.prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              canModerate: true,
              moderatorSince: new Date(),
            },
          });

          await tx.notification.create({
            data: {
              userId: user.id,
              type: 'ModeratorAccess',
              title: 'Moderator Access Granted',
              message: `Congratulations! You've earned moderator access by reaching $${threshold}. You can now review submissions and earn moderation fees.`,
            },
          });
        });
      }

      return {
        message: `${eligibleUsers.length} users upgraded to moderators`,
        upgradedCount: eligibleUsers.length,
      };
    } catch (error) {
      throw error;
    }
  }
}
