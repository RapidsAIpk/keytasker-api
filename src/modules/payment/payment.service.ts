import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { FindPaymentsDto } from './dto/find-payments.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { UserRole, PaymentStatus } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Request a payment/withdrawal (Users only)
   */
  async requestPayment(requestDto: RequestPaymentDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get minimum withdrawal amount from settings
      const settings = await this.prisma.platformSettings.findFirst();
      const minimumWithdrawal = settings?.minimumWithdrawal || 10;

      // Check if user has sufficient balance
      if (user.pendingEarnings < requestDto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: $${user.pendingEarnings.toFixed(2)}`,
        );
      }

      // Check minimum withdrawal
      if (requestDto.amount < minimumWithdrawal) {
        throw new BadRequestException(
          `Minimum withdrawal amount is $${minimumWithdrawal}`,
        );
      }

      // Check for existing pending payment
      const existingPending = await this.prisma.payment.findFirst({
        where: {
          userId,
          status: PaymentStatus.Pending,
        },
      });

      if (existingPending) {
        throw new BadRequestException(
          'You already have a pending payment request',
        );
      }

      // Get user's approved submissions for this payment
      const submissions = await this.prisma.taskSubmission.findMany({
        where: {
          userId,
          status: 'Approved',
          basePaymentAwarded: true,
        },
        select: {
          id: true,
          totalPayment: true,
          basePaymentAwarded: true,
          bonusPaymentAwarded: true,
          task: {
            select: {
              basePayment: true,
              bonusPayment: true,
            },
          },
        },
      });

      // Calculate payment breakdown
      let basePayments = 0;
      let bonusPayments = 0;
      const submissionIds: string[] = [];

      submissions.forEach((submission) => {
        if (submission.totalPayment <= requestDto.amount - basePayments - bonusPayments) {
          submissionIds.push(submission.id);
          if (submission.basePaymentAwarded) {
            basePayments += submission.task.basePayment;
          }
          if (submission.bonusPaymentAwarded) {
            bonusPayments += submission.task.bonusPayment;
          }
        }
      });

      // Add moderation fees if user is a moderator
      const moderationFees = user.canModerate 
        ? Math.min(
            requestDto.amount - basePayments - bonusPayments,
            user.pendingEarnings - basePayments - bonusPayments,
          )
        : 0;

      const payment = await this.prisma.$transaction(async (tx) => {
        // Create payment request
        const newPayment = await tx.payment.create({
          data: {
            userId,
            amount: requestDto.amount,
            basePayments,
            bonusPayments,
            moderationFees,
            status: PaymentStatus.Pending,
            paymentMethod: 'ManualCSV',
            submissionIds,
          },
        });

        // Deduct from pending earnings
        await tx.user.update({
          where: { id: userId },
          data: {
            pendingEarnings: {
              decrement: requestDto.amount,
            },
          },
        });

        // Create notification
        await tx.notification.create({
          data: {
            userId,
            type: 'PaymentProcessed',
            title: 'Payment Request Submitted',
            message: `Your payment request for $${requestDto.amount.toFixed(2)} has been submitted for review.`,
            link: `/payments/${newPayment.id}`,
          },
        });

        return newPayment;
      });

      return {
        message: 'Payment request submitted successfully',
        payment,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all payments with filtering (Admin/Manager view all, Users view own)
   */
  async findAll({ page, limit, sortDto, filters }: FindPaymentsDto, req: any) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 200);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = { deletedAt: null };

      // Regular users can only see their own payments
      if (user.role === UserRole.User) {
        where.userId = req.user.id;
      }

      // Apply filters
      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
        if (filters.flaggedOnly) where.flaggedAsSuspicious = true;
        if (filters.minAmount !== undefined) {
          where.amount = { ...where.amount, gte: filters.minAmount };
        }
        if (filters.maxAmount !== undefined) {
          where.amount = { ...where.amount, lte: filters.maxAmount };
        }
      }

      let totalCount = await this.prisma.payment.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const payments = await this.prisma.payment.findMany({
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
        },
      });

      return {
        totalCount,
        payments,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single payment by ID
   */
  async findOne(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const payment = await this.prisma.payment.findUnique({
        where: { id, deletedAt: null },
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

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Users can only view their own payments
      if (
        user?.role === UserRole.User &&
        payment.userId !== userId
      ) {
        throw new ForbiddenException('You can only view your own payments');
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Review a payment (Admin/Manager only)
   */
  async reviewPayment(reviewDto: ReviewPaymentDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can review payments',
        );
      }

      const payment = await this.prisma.payment.findUnique({
        where: { id: reviewDto.paymentId },
        include: { user: true },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.Pending) {
        throw new BadRequestException(
          'Only pending payments can be reviewed',
        );
      }

      const updatedPayment = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id: reviewDto.paymentId },
          data: {
            status: reviewDto.status,
            flaggedAsSuspicious: reviewDto.flagAsSuspicious || false,
            reviewNotes: reviewDto.reviewNotes,
            reviewedBy: userId,
            reviewedAt: new Date(),
            ...(reviewDto.status === PaymentStatus.Completed && {
              processedAt: new Date(),
            }),
          },
        });

        // If payment was rejected, return amount to user's pending balance
        if (reviewDto.status === PaymentStatus.Failed) {
          await tx.user.update({
            where: { id: payment.userId },
            data: {
              pendingEarnings: {
                increment: payment.amount,
              },
            },
          });
        }

        // If payment was completed, update user's withdrawn amount
        if (reviewDto.status === PaymentStatus.Completed) {
          await tx.user.update({
            where: { id: payment.userId },
            data: {
              withdrawnAmount: {
                increment: payment.amount,
              },
            },
          });
        }

        // Create notification
        const notificationMessage =
          reviewDto.status === PaymentStatus.Completed
            ? `Your payment of $${payment.amount.toFixed(2)} has been processed successfully.`
            : reviewDto.status === PaymentStatus.Failed
              ? `Your payment request of $${payment.amount.toFixed(2)} was declined. ${reviewDto.reviewNotes || ''}`
              : `Your payment status has been updated.`;

        await tx.notification.create({
          data: {
            userId: payment.userId,
            type: 'PaymentProcessed',
            title: 'Payment Status Updated',
            message: notificationMessage,
            link: `/payments/${payment.id}`,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId,
            activityType: 'PaymentReviewed',
            description: `Reviewed payment for ${payment.user.fullName}: $${payment.amount}`,
            metadata: {
              paymentId: payment.id,
              status: reviewDto.status,
              flagged: reviewDto.flagAsSuspicious,
            },
          },
        });

        return updated;
      });

      return {
        message: 'Payment reviewed successfully',
        payment: updatedPayment,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export payments to CSV (Admin/Manager only)
   */
  async exportToCSV(userId: string, filters?: any) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can export payments',
        );
      }

      const where: any = { deletedAt: null };

      // Apply filters if provided
      if (filters?.status) where.status = filters.status;
      if (filters?.flaggedOnly) where.flaggedAsSuspicious = true;
      if (filters?.startDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
      }
      if (filters?.endDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
      }

      const payments = await this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

      // Generate CSV content
      const csvHeader = [
        'Payment ID',
        'User ID',
        'User Name',
        'User Email',
        'Amount',
        'Base Payments',
        'Bonus Payments',
        'Moderation Fees',
        'Status',
        'Payment Method',
        'Flagged',
        'Created At',
        'Reviewed At',
        'Processed At',
        'Review Notes',
      ].join(',');

      const csvRows = payments.map((payment) =>
        [
          payment.id,
          payment.user.id,
          `"${payment.user.fullName}"`,
          payment.user.email,
          payment.amount,
          payment.basePayments,
          payment.bonusPayments,
          payment.moderationFees,
          payment.status,
          payment.paymentMethod,
          payment.flaggedAsSuspicious ? 'Yes' : 'No',
          payment.createdAt.toISOString(),
          payment.reviewedAt?.toISOString() || '',
          payment.processedAt?.toISOString() || '',
          `"${payment.reviewNotes || ''}"`,
        ].join(','),
      );

      const csvContent = [csvHeader, ...csvRows].join('\n');

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'SettingsChanged',
          description: 'Exported payments to CSV',
          metadata: {
            paymentCount: payments.length,
            filters,
          },
        },
      });

      return {
        csvContent,
        filename: `payments-export-${new Date().toISOString().split('T')[0]}.csv`,
        totalRecords: payments.length,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment statistics (Admin/Manager only)
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
          'Only admins and managers can view payment statistics',
        );
      }

      const [
        totalPayments,
        pendingPayments,
        completedPayments,
        failedPayments,
        flaggedPayments,
        totalPaidOut,
        totalPending,
      ] = await Promise.all([
        this.prisma.payment.count(),
        this.prisma.payment.count({ where: { status: PaymentStatus.Pending } }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.Completed },
        }),
        this.prisma.payment.count({ where: { status: PaymentStatus.Failed } }),
        this.prisma.payment.count({ where: { flaggedAsSuspicious: true } }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.Completed },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.Pending },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalPayments,
        pendingPayments,
        completedPayments,
        failedPayments,
        flaggedPayments,
        totalPaidOut: totalPaidOut._sum.amount || 0,
        totalPending: totalPending._sum.amount || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get my payment requests (Users)
   */
  async getMyPayments(userId: string, page: number = 1, limit: number = 20) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const [payments, totalCount] = await Promise.all([
        this.prisma.payment.findMany({
          where: { userId, deletedAt: null },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.payment.count({
          where: { userId, deletedAt: null },
        }),
      ]);

      return {
        payments,
        totalCount,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }
}
