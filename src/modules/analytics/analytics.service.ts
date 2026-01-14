import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { FindActivityLogsDto } from './dto/find-activity-logs.dto';
import { UserRole } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardOverview(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view dashboard analytics',
        );
      }

      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalCampaigns,
        activeCampaigns,
        totalTasks,
        activeTasks,
        completedTasks,
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        totalModerators,
        activeModerators,
        totalPayments,
        pendingPayments,
        completedPayments,
        totalPaidOut,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { accountStatus: 'Active' } }),
        this.prisma.user.count({ where: { accountStatus: 'Suspended' } }),
        this.prisma.campaign.count({ where: { deletedAt: null } }),
        this.prisma.campaign.count({
          where: { status: 'Active', deletedAt: null },
        }),
        this.prisma.task.count({ where: { deletedAt: null } }),
        this.prisma.task.count({
          where: { status: 'Active', deletedAt: null },
        }),
        this.prisma.task.count({
          where: { status: 'Completed', deletedAt: null },
        }),
        this.prisma.taskSubmission.count(),
        this.prisma.taskSubmission.count({
          where: { status: 'PendingModeration' },
        }),
        this.prisma.taskSubmission.count({ where: { status: 'Approved' } }),
        this.prisma.taskSubmission.count({ where: { status: 'Rejected' } }),
        this.prisma.user.count({ where: { canModerate: true } }),
        this.prisma.user.count({
          where: { canModerate: true, moderatorVotes: { gt: 0 } },
        }),
        this.prisma.payment.count(),
        this.prisma.payment.count({ where: { status: 'Pending' } }),
        this.prisma.payment.count({ where: { status: 'Completed' } }),
        this.prisma.payment.aggregate({
          where: { status: 'Completed' },
          _sum: { amount: true },
        }),
      ]);

      const approvalRate =
        totalSubmissions > 0
          ? (approvedSubmissions / totalSubmissions) * 100
          : 0;

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        tasks: {
          total: totalTasks,
          active: activeTasks,
          completed: completedTasks,
        },
        submissions: {
          total: totalSubmissions,
          pending: pendingSubmissions,
          approved: approvedSubmissions,
          rejected: rejectedSubmissions,
          approvalRate: Number(approvalRate.toFixed(2)),
        },
        moderation: {
          totalModerators,
          activeModerators,
        },
        payments: {
          total: totalPayments,
          pending: pendingPayments,
          completed: completedPayments,
          totalPaidOut: totalPaidOut._sum.amount || 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserAnalytics(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view user analytics',
        );
      }

      const topEarners = await this.prisma.user.findMany({
        where: { role: UserRole.User },
        orderBy: { totalEarnings: 'desc' },
        take: 10,
        select: {
          id: true,
          fullName: true,
          totalEarnings: true,
          tasksCompleted: true,
          rejectionRate: true,
        },
      });

      const recentSignups = await this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          accountStatus: true,
          createdAt: true,
        },
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsersLast30Days = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      return {
        topEarners,
        recentSignups,
        newUsersLast30Days,
      };
    } catch (error) {
      throw error;
    }
  }

  async getTaskPerformance(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view task analytics',
        );
      }

      const tasksByType = await this.prisma.task.groupBy({
        by: ['taskType'],
        where: { deletedAt: null },
        _count: true,
      });

      const lowCompletionTasks = await this.prisma.task.findMany({
        where: {
          status: 'Active',
          deletedAt: null,
          completedCount: { lt: 5 },
        },
        orderBy: { completedCount: 'asc' },
        take: 10,
        select: {
          id: true,
          topicInstruction: true,
          taskType: true,
          totalQuantity: true,
          completedCount: true,
          approvalRate: true,
        },
      });

      const highRejectionTasks = await this.prisma.task.findMany({
        where: {
          deletedAt: null,
          rejectedCount: { gt: 0 },
        },
        orderBy: { approvalRate: 'asc' },
        take: 10,
        select: {
          id: true,
          topicInstruction: true,
          taskType: true,
          approvedCount: true,
          rejectedCount: true,
          approvalRate: true,
        },
      });

      return {
        tasksByType,
        lowCompletionTasks,
        highRejectionTasks,
      };
    } catch (error) {
      throw error;
    }
  }

  async getActivityLogs(
    { page, limit, sortDto, filters }: FindActivityLogsDto,
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
          'Only admins and managers can view activity logs',
        );
      }

      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = {};

      if (filters) {
        if (filters.activityType) where.activityType = filters.activityType;
        if (filters.userId) where.userId = filters.userId;
      }

      const totalCount = await this.prisma.activityLog.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const logs = await this.prisma.activityLog.findMany({
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
              role: true,
            },
          },
        },
      });

      return {
        logs,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: pageNumber,
        pageSize,
      };
    } catch (error) {
      throw error;
    }
  }
}