import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { FindPaymentsDto } from './dto/find-payments.dto';
import { FindMyPaymentsDto } from './dto/find-my-payments.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { UserRole, PaymentStatus } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async requestPayment(requestDto: RequestPaymentDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.accountStatus === 'Suspended' || user.accountStatus === 'Banned') {
        throw new ForbiddenException('Your account is suspended');
      }

      const settings = await this.prisma.platformSettings.findFirst();
      const minimumWithdrawal = settings?.minimumWithdrawal || 10;

      if (requestDto.amount < minimumWithdrawal) {
        throw new BadRequestException(
          `Minimum withdrawal amount is $${minimumWithdrawal}`,
        );
      }

      if (user.pendingEarnings < requestDto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: $${user.pendingEarnings.toFixed(2)}`,
        );
      }

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

      const submissions = await this.prisma.taskSubmission.findMany({
        where: {
          userId,
          status: 'Approved',
          paymentId: null,
        },
        orderBy: { finalizedAt: 'asc' },
        include: {
          task: {
            select: {
              basePayment: true,
              bonusPayment: true,
            },
          },
        },
      });

      let totalFromSubmissions = 0;
      let basePayments = 0;
      let bonusPayments = 0;
      const submissionIds: string[] = [];

      for (const submission of submissions) {
        if (totalFromSubmissions + submission.totalPayment <= requestDto.amount) {
          submissionIds.push(submission.id);
          totalFromSubmissions += submission.totalPayment;

          if (submission.basePaymentAwarded) {
            basePayments += submission.task.basePayment;
          }
          if (submission.bonusPaymentAwarded) {
            bonusPayments += submission.task.bonusPayment;
          }
        } else {
          break;
        }
      }

      const moderationFees = requestDto.amount - totalFromSubmissions;

      const totalAvailableSubmissions = submissions.reduce((sum, s) => sum + s.totalPayment, 0);
      const estimatedModerationEarnings = user.pendingEarnings - totalAvailableSubmissions;

      if (moderationFees > estimatedModerationEarnings) {
        throw new BadRequestException(
          `Cannot fulfill payment request. Maximum available: $${user.pendingEarnings.toFixed(2)}`,
        );
      }

      const payment = await this.prisma.$transaction(async (tx) => {
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

        if (submissionIds.length > 0) {
          await tx.taskSubmission.updateMany({
            where: { id: { in: submissionIds } },
            data: {
              paymentId: newPayment.id,
              paidAt: new Date(),
            },
          });
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            pendingEarnings: {
              decrement: requestDto.amount,
            },
          },
        });

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

      if (user.role === UserRole.User) {
        where.userId = req.user.id;
      }

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

      const totalCount = await this.prisma.payment.count({ where });

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
              accountStatus: true,
            },
          },
        },
      });

      return {
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: pageNumber,
        pageSize,
        payments,
      };
    } catch (error) {
      throw error;
    }
  }

  async getMyPayments({ page, limit, sortDto, filters }: FindMyPaymentsDto, userId: string) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = { userId, deletedAt: null };

      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
      }

      const totalCount = await this.prisma.payment.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const payments = await this.prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      });

      return {
        payments,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: pageNumber,
        pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

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
              accountStatus: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (user?.role === UserRole.User && payment.userId !== userId) {
        throw new ForbiddenException('You can only view your own payments');
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

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

      if (payment.status !== PaymentStatus.Pending) {
        throw new BadRequestException(
          `Payment has already been reviewed. Current status: ${payment.status}`,
        );
      }

      if (
        reviewDto.status !== PaymentStatus.Completed &&
        reviewDto.status !== PaymentStatus.Failed
      ) {
        throw new BadRequestException(
          'Payment can only be marked as Completed or Failed',
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

        if (reviewDto.status === PaymentStatus.Failed) {
          await tx.taskSubmission.updateMany({
            where: { paymentId: payment.id },
            data: {
              paymentId: null,
              paidAt: null,
            },
          });

          await tx.user.update({
            where: { id: payment.userId },
            data: {
              pendingEarnings: {
                increment: payment.amount,
              },
            },
          });
        }

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

      if (filters?.status) where.status = filters.status;
      if (filters?.flaggedOnly) where.flaggedAsSuspicious = true;
      if (filters?.startDate) {
        where.createdAt = {
          ...where.createdAt,
          gte: new Date(filters.startDate),
        };
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

      const escapeCsv = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

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
          escapeCsv(payment.id),
          escapeCsv(payment.user.id),
          escapeCsv(payment.user.fullName),
          escapeCsv(payment.user.email),
          payment.amount.toFixed(2),
          payment.basePayments.toFixed(2),
          payment.bonusPayments.toFixed(2),
          payment.moderationFees.toFixed(2),
          payment.status,
          payment.paymentMethod,
          payment.flaggedAsSuspicious ? 'Yes' : 'No',
          payment.createdAt.toISOString(),
          payment.reviewedAt?.toISOString() || '',
          payment.processedAt?.toISOString() || '',
          escapeCsv(payment.reviewNotes || ''),
        ].join(','),
      );

      const csvContent = [csvHeader, ...csvRows].join('\n');

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
        this.prisma.payment.count({ where: { deletedAt: null } }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.Pending, deletedAt: null },
        }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.Completed, deletedAt: null },
        }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.Failed, deletedAt: null },
        }),
        this.prisma.payment.count({
          where: { flaggedAsSuspicious: true, deletedAt: null },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.Completed, deletedAt: null },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.Pending, deletedAt: null },
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
}