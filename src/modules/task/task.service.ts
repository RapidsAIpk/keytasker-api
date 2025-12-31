import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskStatus, UserRole } from '@prisma/client';

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
          publishedAt: createTaskDto.status === TaskStatus.Active ? new Date() : null,
        },
        include: {
          campaign: true,
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

      if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Manager)) {
        throw new ForbiddenException('Only admins and managers can update tasks');
      }

      // Get existing task
      const existingTask = await this.prisma.task.findUnique({
        where: { id: updateTaskDto.id },
      });

      if (!existingTask) {
        throw new NotFoundException('Task not found');
      }

      // Prepare update data
      const updateData: any = {};
      if (updateTaskDto.taskType !== undefined) updateData.taskType = updateTaskDto.taskType;
      if (updateTaskDto.recipient !== undefined) updateData.recipient = updateTaskDto.recipient;
      if (updateTaskDto.topicInstruction !== undefined) updateData.topicInstruction = updateTaskDto.topicInstruction;
      if (updateTaskDto.detailedInstructions !== undefined) updateData.detailedInstructions = updateTaskDto.detailedInstructions;
      if (updateTaskDto.basePayment !== undefined) updateData.basePayment = updateTaskDto.basePayment;
      if (updateTaskDto.bonusPayment !== undefined) updateData.bonusPayment = updateTaskDto.bonusPayment;
      if (updateTaskDto.totalQuantity !== undefined) updateData.totalQuantity = updateTaskDto.totalQuantity;
      if (updateTaskDto.status !== undefined) {
        updateData.status = updateTaskDto.status;
        // Set publishedAt if status is being set to Active for the first time
        if (updateTaskDto.status === TaskStatus.Active && !existingTask.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      // Update the task
      const task = await this.prisma.task.update({
        where: { id: updateTaskDto.id },
        data: updateData,
        include: {
          campaign: true,
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
   * Get all tasks with filters (Admin/Manager view all, Users view available only)
   */
  async findAll(filterDto: TaskFilterDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const page = filterDto.page || 1;
      const limit = filterDto.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter conditions
      const where: any = {
        deletedAt: null,
      };

      // Apply filters
      if (filterDto.taskType) where.taskType = filterDto.taskType;
      if (filterDto.status) where.status = filterDto.status;
      if (filterDto.campaignId) where.campaignId = filterDto.campaignId;
      
      if (filterDto.search) {
        where.OR = [
          { recipient: { contains: filterDto.search, mode: 'insensitive' } },
          { topicInstruction: { contains: filterDto.search, mode: 'insensitive' } },
        ];
      }

      // For regular users, only show Active tasks they haven't completed yet
      // and exclude tasks from campaigns they've already interacted with
      if (user.role === UserRole.User) {
        where.status = TaskStatus.Active;

        // Get campaigns user has already interacted with
        const userCampaignInteractions = await this.prisma.userCampaignInteraction.findMany({
          where: { userId },
          select: { campaignId: true },
        });

        const excludedCampaignIds = userCampaignInteractions.map(interaction => interaction.campaignId);

        // Get tasks user has already submitted
        const userSubmissions = await this.prisma.taskSubmission.findMany({
          where: { userId },
          select: { taskId: true },
        });

        const excludedTaskIds = userSubmissions.map(sub => sub.taskId);

        // Add exclusions
        if (excludedCampaignIds.length > 0) {
          where.campaignId = { notIn: excludedCampaignIds };
        }
        if (excludedTaskIds.length > 0) {
          where.id = { notIn: excludedTaskIds };
        }

        // Only show tasks that still have capacity
        where.completedCount = { lt: where.totalQuantity };
      }

      // For managers, apply special filters
      if (user.role === UserRole.Manager || user.role === UserRole.Admin) {
        if (filterDto.lowCompletionRate) {
          where.approvalRate = { lt: 0.5 }; // Less than 50% completion rate
        }
        if (filterDto.highRejectionRate) {
          where.approvalRate = { lt: 0.6 }; // Less than 60% approval rate
        }
      }

      // Get tasks
      const [tasks, totalCount] = await Promise.all([
        this.prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            campaign: user.role === UserRole.Admin || user.role === UserRole.Manager ? true : false, // Hide campaign from users
            _count: {
              select: {
                submissions: true,
                reservations: true,
              },
            },
          },
        }),
        this.prisma.task.count({ where }),
      ]);

      // For users, hide campaign information and sensitive data
      let sanitizedTasks: any[] = tasks;
      if (user.role === UserRole.User) {
        sanitizedTasks = tasks.map(task => {
          const { campaign, createdBy, ...taskData } = task as any;
          return {
            ...taskData,
            availableSlots: (task as any).totalQuantity - (task as any).completedCount,
          };
        });
      }

      return {
        tasks: sanitizedTasks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit,
        },
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
        where: { id },
        include: {
          campaign: user.role === UserRole.Admin || user.role === UserRole.Manager ? true : false,
          submissions: user.role === UserRole.Admin || user.role === UserRole.Manager ? {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
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

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      // Check if user can access this task
      if (user.role === UserRole.User) {
        // Check if task is from a campaign user has already interacted with
        const hasInteracted = await this.prisma.userCampaignInteraction.findUnique({
          where: {
            userId_campaignId: {
              userId,
              campaignId: task.campaignId,
            },
          },
        });

        if (hasInteracted) {
          throw new ForbiddenException('You cannot access tasks from a campaign you have already interacted with');
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
   * Get task statistics for dashboard
   */
  async getTaskStats(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Manager)) {
        throw new ForbiddenException('Only admins and managers can view task statistics');
      }

      const [
        totalTasks,
        activeTasks,
        completedTasks,
        pausedTasks,
        totalCompletions,
        totalApprovals,
        totalRejections,
      ] = await Promise.all([
        this.prisma.task.count({ where: { deletedAt: null } }),
        this.prisma.task.count({ where: { status: TaskStatus.Active, deletedAt: null } }),
        this.prisma.task.count({ where: { status: TaskStatus.Completed, deletedAt: null } }),
        this.prisma.task.count({ where: { status: TaskStatus.Paused, deletedAt: null } }),
        this.prisma.taskSubmission.count(),
        this.prisma.taskSubmission.count({ where: { status: 'Approved' } }),
        this.prisma.taskSubmission.count({ where: { status: 'Rejected' } }),
      ]);

      const averageApprovalRate = totalCompletions > 0 ? (totalApprovals / totalCompletions) * 100 : 0;

      return {
        totalTasks,
        activeTasks,
        completedTasks,
        pausedTasks,
        totalCompletions,
        totalApprovals,
        totalRejections,
        averageApprovalRate: averageApprovalRate.toFixed(2),
      };
    } catch (error) {
      throw error;
    }
  }
}