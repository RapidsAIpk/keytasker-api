import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskStatus, UserRole, Prisma } from '@prisma/client';
import { SortEnum } from '@config/constants';
@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new task (Admin only)
   */
  async create(createTaskDto: CreateTaskDto, userId: string) {
    try {
      // Verify user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can create tasks');
      }

      // Verify campaign exists
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: createTaskDto.campaignId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      // Create the task
      const task = await this.prisma.task.create({
        data: {
          taskType: createTaskDto.taskType,
          recipient: createTaskDto.recipient,
          topicInstruction: createTaskDto.topicInstruction,
          detailedInstructions: createTaskDto.detailedInstructions || '',
          basePayment: createTaskDto.basePayment || 1,
          bonusPayment: createTaskDto.bonusPayment || 4,
          totalQuantity: createTaskDto.totalQuantity,
          campaignId: createTaskDto.campaignId,
          status: createTaskDto.status || TaskStatus.Active,
          createdBy: userId,
          publishedAt:
            createTaskDto.status === TaskStatus.Active ? new Date() : null,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            },
          },
        },
      });

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskCreated',
          description: `Created task: ${task.topicInstruction}`,
          metadata: {
            taskId: task.id,
            taskType: task.taskType,
            campaignId: task.campaignId,
          },
        },
      });

      return {
        message: 'Task created successfully',
        task,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing task (Admin/Manager only)
   */
  async update(updateTaskDto: UpdateTaskDto, userId: string) {
    try {
      // Verify user is admin or manager
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can update tasks',
        );
      }

      // Get existing task
      const existingTask = await this.prisma.task.findUnique({
        where: { id: updateTaskDto.id },
      });

      if (!existingTask) {
        throw new NotFoundException('Task not found');
      }

      // Check if task has been deleted
      if (existingTask.deletedAt) {
        throw new BadRequestException('Cannot update a deleted task');
      }

      // Prepare update data
      const updateData: any = {};
      if (updateTaskDto.taskType !== undefined)
        updateData.taskType = updateTaskDto.taskType;
      if (updateTaskDto.recipient !== undefined)
        updateData.recipient = updateTaskDto.recipient;
      if (updateTaskDto.topicInstruction !== undefined)
        updateData.topicInstruction = updateTaskDto.topicInstruction;
      if (updateTaskDto.detailedInstructions !== undefined)
        updateData.detailedInstructions = updateTaskDto.detailedInstructions;
      if (updateTaskDto.basePayment !== undefined)
        updateData.basePayment = updateTaskDto.basePayment;
      if (updateTaskDto.bonusPayment !== undefined)
        updateData.bonusPayment = updateTaskDto.bonusPayment;
      if (updateTaskDto.totalQuantity !== undefined)
        updateData.totalQuantity = updateTaskDto.totalQuantity;
      if (updateTaskDto.status !== undefined) {
        updateData.status = updateTaskDto.status;
        // Set publishedAt if status is being set to Active for the first time
        if (
          updateTaskDto.status === TaskStatus.Active &&
          !existingTask.publishedAt
        ) {
          updateData.publishedAt = new Date();
        }
      }

      // Update the task
      const task = await this.prisma.task.update({
        where: { id: updateTaskDto.id },
        data: updateData,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            },
          },
        },
      });

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskEdited',
          description: `Updated task: ${task.topicInstruction}`,
          metadata: {
            taskId: task.id,
            changes: updateData,
          },
        },
      });

      return {
        message: 'Task updated successfully',
        task,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all tasks with filters and sorting (Admin/Manager view all, Users view available only)
   */
async findAllTasks({ page, limit, sortDto, filters }: TaskFilterDto, req) {
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

      const where: any = {
        deletedAt: null,
      };

      if (filters) {
        if (filters.taskType) where.taskType = filters.taskType;
        if (filters.status) where.status = filters.status;
      }

      if (user.role === UserRole.User) {
        where.status = TaskStatus.Active;

        const userCampaignInteractions = await this.prisma.userCampaignInteraction.findMany({
          where: { userId: req.user.id },
          select: { campaignId: true },
        });

        const excludedCampaignIds = userCampaignInteractions.map(interaction => interaction.campaignId);

        const userSubmissions = await this.prisma.taskSubmission.findMany({
          where: { userId: req.user.id },
          select: { taskId: true },
        });

        const excludedTaskIds = userSubmissions.map(sub => sub.taskId);

        if (excludedCampaignIds.length > 0) {
          where.campaignId = { notIn: excludedCampaignIds };
        }
        if (excludedTaskIds.length > 0) {
          where.id = { notIn: excludedTaskIds };
        }
      }

      let totalCount = await this.prisma.task.count({ where });

      let orderBy: any = {};

      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const tasks = await this.prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          campaign: user.role === UserRole.Admin || user.role === UserRole.Manager ? {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            },
          } : false,
          _count: {
            select: {
              submissions: true,
              reservations: true,
            },
          },
        },
      });

      const sanitizedTasks = user.role === UserRole.User 
        ? tasks.map(({ campaign, createdBy, ...taskData }: any) => ({
            ...taskData,
            availableSlots: taskData.totalQuantity - taskData.completedCount,
          }))
        : tasks;

      return {
        totalCount,
        tasks: sanitizedTasks,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single task by ID
   */
  async findOne(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const task = await this.prisma.task.findUnique({
        where: { id, deletedAt: null },
        include: {
          campaign:
            user.role === UserRole.Admin || user.role === UserRole.Manager
              ? {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                  },
                }
              : false,
          submissions:
            user.role === UserRole.Admin || user.role === UserRole.Manager
              ? {
                  include: {
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                      },
                    },
                  },
                }
              : false,
          _count: {
            select: {
              submissions: true,
              reservations: true,
            },
          },
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Check if user can access this task
      if (user.role === UserRole.User) {
        // Check if task is from a campaign user has already interacted with
        const hasInteracted =
          await this.prisma.userCampaignInteraction.findUnique({
            where: {
              userId_campaignId: {
                userId,
                campaignId: task.campaignId,
              },
            },
          });

        if (hasInteracted) {
          throw new ForbiddenException(
            'You cannot access tasks from a campaign you have already interacted with',
          );
        }

        // Check if user has already submitted this task
        const hasSubmitted = await this.prisma.taskSubmission.findFirst({
          where: {
            userId,
            taskId: id,
          },
        });

        if (hasSubmitted) {
          throw new ForbiddenException('You have already submitted this task');
        }

        // Remove sensitive data for users
        const { campaign, createdBy, submissions, ...taskData } = task;
        return {
          ...taskData,
          availableSlots: task.totalQuantity - task.completedCount,
        };
      }

      return task;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a task (Admin only, soft delete)
   */
  async remove(id: string, userId: string) {
    try {
      // Verify user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can delete tasks');
      }

      // Check if task exists
      const task = await this.prisma.task.findUnique({
        where: { id },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (task.deletedAt) {
        throw new BadRequestException('Task is already deleted');
      }

      // Soft delete
      await this.prisma.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskDeleted',
          description: `Deleted task: ${task.topicInstruction}`,
          metadata: {
            taskId: task.id,
            taskType: task.taskType,
          },
        },
      });

      return {
        message: 'Task deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get task statistics for dashboard (Admin/Manager only)
   */
  async getTaskStats(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view task statistics',
        );
      }

      const [
        totalTasks,
        activeTasks,
        completedTasks,
        pausedTasks,
        totalSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        pendingSubmissions,
      ] = await Promise.all([
        this.prisma.task.count({ where: { deletedAt: null } }),
        this.prisma.task.count({
          where: { status: TaskStatus.Active, deletedAt: null },
        }),
        this.prisma.task.count({
          where: { status: TaskStatus.Completed, deletedAt: null },
        }),
        this.prisma.task.count({
          where: { status: TaskStatus.Paused, deletedAt: null },
        }),
        this.prisma.taskSubmission.count(),
        this.prisma.taskSubmission.count({
          where: { status: 'Approved' },
        }),
        this.prisma.taskSubmission.count({
          where: { status: 'Rejected' },
        }),
        this.prisma.taskSubmission.count({
          where: { status: 'PendingModeration' },
        }),
      ]);

      const averageApprovalRate =
        totalSubmissions > 0
          ? (approvedSubmissions / totalSubmissions) * 100
          : 0;

      return {
        totalTasks,
        activeTasks,
        completedTasks,
        pausedTasks,
        totalSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        pendingSubmissions,
        averageApprovalRate: Number(averageApprovalRate.toFixed(2)),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reserve a task for a user
   */
  async reserveTask(taskId: string, userId: string) {
    try {
      // Get platform settings for reservation time
      const settings = await this.prisma.platformSettings.findFirst();
      const reservationMinutes = settings?.taskReservationMinutes || 60;

      // Check if reservations are allowed
      if (!settings?.allowTaskReservations) {
        throw new BadRequestException('Task reservations are currently disabled');
      }

      // Check if task exists and is available
      const task = await this.prisma.task.findUnique({
        where: { id: taskId, deletedAt: null },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (task.status !== TaskStatus.Active) {
        throw new BadRequestException('Task is not available for reservation');
      }

      // Check if user already has a reservation for this task
      const existingReservation = await this.prisma.taskReservation.findFirst({
        where: {
          userId,
          taskId,
          status: { in: ['Reserved', 'InProgress'] },
        },
      });

      if (existingReservation) {
        throw new BadRequestException('You already have a reservation for this task');
      }

      // Check if user already submitted this task
      const existingSubmission = await this.prisma.taskSubmission.findFirst({
        where: {
          userId,
          taskId,
        },
      });

      if (existingSubmission) {
        throw new BadRequestException('You have already submitted this task');
      }

      // Create reservation
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + reservationMinutes);

      const reservation = await this.prisma.taskReservation.create({
        data: {
          userId,
          taskId,
          expiresAt,
          status: 'Reserved',
        },
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
        },
      });

      return {
        message: 'Task reserved successfully',
        reservation,
        expiresInMinutes: reservationMinutes,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a task reservation
   */
  async cancelReservation(reservationId: string, userId: string) {
    try {
      const reservation = await this.prisma.taskReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own reservations');
      }

      if (reservation.status === 'Completed' || reservation.status === 'Cancelled') {
        throw new BadRequestException('Cannot cancel a completed or already cancelled reservation');
      }

      await this.prisma.taskReservation.update({
        where: { id: reservationId },
        data: {
          status: 'Cancelled',
        },
      });

      return {
        message: 'Reservation cancelled successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's reservations
   */
  async getUserReservations(userId: string) {
    try {
      const reservations = await this.prisma.taskReservation.findMany({
        where: {
          userId,
          status: { in: ['Reserved', 'InProgress'] },
        },
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
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        reservations,
      };
    } catch (error) {
      throw error;
    }
  }
}