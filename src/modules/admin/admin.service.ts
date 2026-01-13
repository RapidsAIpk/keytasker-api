import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { SuspendUserDto, ModeratorAccessDto } from './dto/suspend-user.dto';
import { UserRole, AccountStatus } from '@prisma/client';
import {
  AdminUpdateUserDto,
  AdminUpdateUserPasswordDto,
} from './dto/admin-update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FindAllUsersDto } from '@modules/user/dto/find-all-users.dto';
import { FindDeletedUsersDto } from './dto/find-deleted-users.dto';

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
        if (
          suspendDto.status === AccountStatus.Suspended ||
          suspendDto.status === AccountStatus.Banned
        ) {
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
            type:
              suspendDto.status === AccountStatus.Active
                ? 'ModeratorAccess'
                : 'SuspensionNotice',
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
   * Add new user (Admin only)
   */
  async addUser(addUserDto: CreateUserDto, adminId: string) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can add users');
      }

      if (addUserDto.role === UserRole.Admin) {
        throw new BadRequestException('Cannot create Admin users');
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email: addUserDto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      const tempPassword = this.generateRandomPassword(8);
      const bcrypt = require('bcrypt');
      const hashPassword = await bcrypt.hash(tempPassword, 10);

      const newUser = await this.prisma.user.create({
        data: {
          email: addUserDto.email.toLowerCase(),
          fullName: addUserDto.fullName,
          phoneNumber: addUserDto.phoneNumber,
          country: addUserDto.country,
          role: addUserDto.role,
          password: hashPassword,
          accountStatus: AccountStatus.Active,
          emailVerified: true,
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: newUser.id,
          type: 'ModeratorAccess',
          title: 'Account Created',
          message: `Welcome! Your account has been created by an administrator. A temporary password has been sent to your email: ${tempPassword}`,
        },
      });

      const { password, ...safeUser } = newUser;
      return {
        message: 'User created successfully',
        user: safeUser,
      };
    } catch (error) {
      throw error;
    }
  }

  private generateRandomPassword(length: number): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
  /**
   * Update user details (Admin only)
   */
  async adminUpdateUser(
    userId: string,
    dto: AdminUpdateUserDto,
    adminId: string,
  ) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can update users');
      }

      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existing) {
        throw new NotFoundException('User not found');
      }

      const data: any = {};
      if (dto.fullName !== undefined) data.fullName = dto.fullName;
      if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
      if (dto.country !== undefined) data.country = dto.country;
      if (dto.role !== undefined) data.role = dto.role;
      if (dto.accountStatus !== undefined)
        data.accountStatus = dto.accountStatus;

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
      });

      const { password, ...userWithoutPassword } = updated;
      return {
        message: 'User updated successfully',
        user: userWithoutPassword,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user password (Admin only)
   */
  async adminUpdateUserPassword(
    userId: string,
    dto: AdminUpdateUserPasswordDto,
    adminId: string,
  ) {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can update user passwords');
      }

      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      const user = await this.prisma.user.findFirst({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      const { password, ...userWithoutPassword } = updated;
      return {
        message: `Password updated for ${user.email}`,
        user: userWithoutPassword,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateUserStatus(
    updateUserStatusDto: UpdateUserStatusDto,
    userId: string,
  ) {
    try {
      const adminCheck = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (adminCheck?.role !== UserRole.Admin) {
        throw new BadRequestException('You dont have Permission');
      }

      const updatedUserStatus = await this.prisma.user.update({
        where: {
          id: updateUserStatusDto.id,
        },
        data: {
          accountStatus: updateUserStatusDto.accountStatus,
        },
      });

      const { password, ...safeUpdatedUserStatus } = updatedUserStatus;

      return {
        updatedUserStatus: safeUpdatedUserStatus,
        message: 'User status has been updated',
      };
    } catch (error) {
      throw error;
    }
  }

    async findAllUsers({ page, limit, sortDto, filters }: FindAllUsersDto, req) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 200);
      const skip = (pageNumber - 1) * pageSize;

      const matchStage: any = {
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      };

      if (filters) {
        if (filters.fullName) {
          matchStage.fullName = { $regex: filters.fullName, $options: 'i' };
        }
        if (filters.email) {
          matchStage.email = { $regex: filters.email, $options: 'i' };
        }
        if (filters.role) {
          matchStage.role = filters.role;
        }
        if (filters.accountStatus) {
          matchStage.accountStatus = filters.accountStatus;
        }
        if (filters.country) {
          matchStage.country = { $regex: filters.country, $options: 'i' };
        }
      }

      const totalCountResult: any = await this.prisma.user.aggregateRaw({
        pipeline: [{ $match: matchStage }, { $count: 'total' }],
      });

      const totalCount = totalCountResult?.[0]?.total || 0;

      let sortStage: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none') {
        sortStage[sortDto.name] = sortDto.sort === 'asc' ? 1 : -1;
      } else {
        sortStage['createdAt'] = -1;
      }

      const usersResult: any = await this.prisma.user.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $sort: sortStage },
          { $skip: skip },
          { $limit: pageSize },
        ],
      });

      const users = (usersResult || []).map(({ password, _id, ...u }: any) => ({
        id: _id.$oid,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        accountStatus: u.accountStatus,
        emailVerificationCode: u.emailVerificationCode || null,
        emailVerified: u.emailVerified,
        profilePicture: u.profilePicture || null,
        phoneNumber: u.phoneNumber || null,
        country: u.country || null,
        totalEarnings: u.totalEarnings,
        pendingEarnings: u.pendingEarnings,
        withdrawnAmount: u.withdrawnAmount,
        tasksCompleted: u.tasksCompleted,
        tasksRejected: u.tasksRejected,
        rejectionRate: u.rejectionRate,
        canModerate: u.canModerate,
        moderatorSince: u.moderatorSince?.$date || null,
        moderatorVotes: u.moderatorVotes,
        moderatorAccuracy: u.moderatorAccuracy,
        suspensionEndDate: u.suspensionEndDate?.$date || null,
        suspensionReason: u.suspensionReason || null,
        warningsCount: u.warningsCount,
        createdAt: u.createdAt.$date,
        updatedAt: u.updatedAt.$date,
        deletedAt: u.deletedAt?.$date || null,
        lastLogin: u.lastLogin?.$date || null,
        mediaId: u.mediaId || null,
      }));

      return {
        totalCount,
        users,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }
  async findAllDeletedUsers(
    { page, limit, sortDto, filters }: FindDeletedUsersDto,
    req,
  ) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 200);
      const skip = (pageNumber - 1) * pageSize;

      const matchStage: any = {
        deletedAt: { $ne: null },
      };

      if (filters) {
        if (filters.fullName) {
          matchStage.fullName = { $regex: filters.fullName, $options: 'i' };
        }
        if (filters.email) {
          matchStage.email = { $regex: filters.email, $options: 'i' };
        }
        if (filters.role) {
          matchStage.role = filters.role;
        }
        if (filters.accountStatus) {
          matchStage.accountStatus = filters.accountStatus;
        }
        if (filters.country) {
          matchStage.country = { $regex: filters.country, $options: 'i' };
        }
      }

      const totalCountResult: any = await this.prisma.user.aggregateRaw({
        pipeline: [{ $match: matchStage }, { $count: 'total' }],
      });

      const totalCount = totalCountResult?.[0]?.total || 0;

      let sortStage: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none') {
        sortStage[sortDto.name] = sortDto.sort === 'asc' ? 1 : -1;
      } else {
        sortStage['createdAt'] = -1;
      }

      const deletedUsersResult: any = await this.prisma.user.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $sort: sortStage },
          { $skip: skip },
          { $limit: pageSize },
        ],
      });

      const users = (deletedUsersResult || []).map(
        ({ password, _id, ...u }: any) => ({
          id: _id.$oid,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          accountStatus: u.accountStatus,
          emailVerificationCode: u.emailVerificationCode || null,
          emailVerified: u.emailVerified,
          profilePicture: u.profilePicture || null,
          phoneNumber: u.phoneNumber || null,
          country: u.country || null,
          totalEarnings: u.totalEarnings,
          pendingEarnings: u.pendingEarnings,
          withdrawnAmount: u.withdrawnAmount,
          tasksCompleted: u.tasksCompleted,
          tasksRejected: u.tasksRejected,
          rejectionRate: u.rejectionRate,
          canModerate: u.canModerate,
          moderatorSince: u.moderatorSince?.$date || null,
          moderatorVotes: u.moderatorVotes,
          moderatorAccuracy: u.moderatorAccuracy,
          suspensionEndDate: u.suspensionEndDate?.$date || null,
          suspensionReason: u.suspensionReason || null,
          warningsCount: u.warningsCount,
          createdAt: u.createdAt.$date,
          updatedAt: u.updatedAt.$date,
          deletedAt: u.deletedAt?.$date || null,
          lastLogin: u.lastLogin?.$date || null,
          mediaId: u.mediaId || null,
        }),
      );

      return {
        totalCount,
        users,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }
  async restore(id: string, user: any) {
    try {
      console.log('[restore] called with id:', id, 'by user:', {
        id: user?.id,
        role: user?.role,
        name: user?.fullName,
      });

      const existing = await this.prisma.user.findFirst({
        where: { id: id },
      });
      console.log(
        '[restore] existing user found?',
        !!existing,
        'id:',
        existing?.id,
        'deletedAt:',
        existing?.deletedAt,
      );
      if (!existing) throw new BadRequestException('User not found');
      if (existing.deletedAt == null) {
        console.log(
          '[restore] ⚠️ user is not deleted; proceeding to ensure blockchain/onchain but clearing deletedAt anyway',
        );
      }

      // 1) Undo soft delete FIRST
      console.time('[restore] prisma.user.update (clear deletedAt)');
      let restoredUser = await this.prisma.user.update({
        where: { id: id },
        data: { deletedAt: null },
      });
      console.timeEnd('[restore] prisma.user.update (clear deletedAt)');

      const { password, ...safeUser } = restoredUser;
      const result = {
        success: true,
        message: 'User has been restored successfully!',
        restoredUser: safeUser,
      };

      return result;
    } catch (error) {
      console.error('[restore] ❌ error thrown:', error?.message || error);
      throw error;
    }
  }
    async remove(id: string) {
    try {
      const removedUser = await this.prisma.user.update({
        where: {
          id: id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        message: 'User has been deleted successfully!',
        removedUser,
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
        throw new ForbiddenException('Only admins can manage moderator access');
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
  async getSuspensionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
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
        throw new BadRequestException(
          'No appeal has been submitted for this suspension',
        );
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
