import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { FindAllCampaignsDto } from './dto/find-all-campaigns.dto';
import { UserRole, Prisma } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new campaign (Admin only)
   */
  async create(createCampaignDto: CreateCampaignDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can create campaigns');
      }

      const campaign = await this.prisma.campaign.create({
        data: {
          name: createCampaignDto.name,
          description: createCampaignDto.description || '',
          status: createCampaignDto.status || 'Active',
          createdBy: userId,
        },
      });

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskCreated',
          description: `Created campaign: ${campaign.name}`,
          metadata: {
            campaignId: campaign.id,
          },
        },
      });

      return {
        message: 'Campaign created successfully',
        campaign,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a campaign (Admin only)
   */
  async update(updateCampaignDto: UpdateCampaignDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can update campaigns');
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: updateCampaignDto.id },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      if (campaign.deletedAt) {
        throw new BadRequestException('Cannot update a deleted campaign');
      }

      const updateData: any = {};
      if (updateCampaignDto.name !== undefined)
        updateData.name = updateCampaignDto.name;
      if (updateCampaignDto.description !== undefined)
        updateData.description = updateCampaignDto.description;
      if (updateCampaignDto.status !== undefined)
        updateData.status = updateCampaignDto.status;

      const updatedCampaign = await this.prisma.campaign.update({
        where: { id: updateCampaignDto.id },
        data: updateData,
      });

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskEdited',
          description: `Updated campaign: ${updatedCampaign.name}`,
          metadata: {
            campaignId: updatedCampaign.id,
            changes: updateData,
          },
        },
      });

      return {
        message: 'Campaign updated successfully',
        campaign: updatedCampaign,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all campaigns with filtering and sorting (Admin/Manager only)
   */
async findAll({ page, sortDto }: FindAllCampaignsDto, req) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Manager)) {
        throw new ForbiddenException('Only admins and managers can view campaigns');
      }

      let totalCount = await this.prisma.campaign.count({
        where: { deletedAt: null },
      });

      let orderBy: any = {};

      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const campaigns = await this.prisma.campaign.findMany({
        where: { deletedAt: null },
        skip: page ? (page - 1) * 10 : 0,
        take: page ? 10 : undefined,
        orderBy,
        include: {
          _count: {
            select: {
              tasks: true,
              userInteractions: true,
            },
          },
        },
      });

      return {
        totalCount,
        campaigns,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single campaign by ID (Admin/Manager only)
   */
  async findOne(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view campaign details',
        );
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id, deletedAt: null },
        include: {
          tasks: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              tasks: true,
              userInteractions: true,
            },
          },
        },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      return campaign;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a campaign (Admin only, soft delete)
   */
  async remove(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can delete campaigns');
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      if (campaign.deletedAt) {
        throw new BadRequestException('Campaign is already deleted');
      }

      // Soft delete campaign
      await this.prisma.campaign.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          activityType: 'TaskDeleted',
          description: `Deleted campaign: ${campaign.name}`,
          metadata: {
            campaignId: campaign.id,
          },
        },
      });

      return {
        message: 'Campaign deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get campaign statistics (Admin/Manager only)
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
          'Only admins and managers can view campaign statistics',
        );
      }

      const [
        totalCampaigns,
        activeCampaigns,
        inactiveCampaigns,
        totalTasks,
        totalUserInteractions,
      ] = await Promise.all([
        this.prisma.campaign.count({ where: { deletedAt: null } }),
        this.prisma.campaign.count({
          where: { status: 'Active', deletedAt: null },
        }),
        this.prisma.campaign.count({
          where: { status: 'InActive', deletedAt: null },
        }),
        this.prisma.task.count({ where: { deletedAt: null } }),
        this.prisma.userCampaignInteraction.count(),
      ]);

      return {
        totalCampaigns,
        activeCampaigns,
        inactiveCampaigns,
        totalTasks,
        totalUserInteractions,
        averageTasksPerCampaign:
          totalCampaigns > 0
            ? Number((totalTasks / totalCampaigns).toFixed(2))
            : 0,
      };
    } catch (error) {
      throw error;
    }
  }
}