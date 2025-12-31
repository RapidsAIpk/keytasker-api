import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

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

      return {
        message: 'Campaign created successfully',
        campaign,
      };
    } catch (error) {
      throw error;
    }
  }

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

      const updateData: any = {};
      if (updateCampaignDto.name !== undefined) updateData.name = updateCampaignDto.name;
      if (updateCampaignDto.description !== undefined) updateData.description = updateCampaignDto.description;
      if (updateCampaignDto.status !== undefined) updateData.status = updateCampaignDto.status;

      const updatedCampaign = await this.prisma.campaign.update({
        where: { id: updateCampaignDto.id },
        data: updateData,
      });

      return {
        message: 'Campaign updated successfully',
        campaign: updatedCampaign,
      };
    } catch (error) {
      throw error;
    }
  }

  async findAll(userId: string, page: number = 1, limit: number = 10) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Manager)) {
        throw new ForbiddenException('Only admins and managers can view campaigns');
      }

      const skip = (page - 1) * limit;

      const [campaigns, totalCount] = await Promise.all([
        this.prisma.campaign.findMany({
          where: { deletedAt: null },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                tasks: true,
                userInteractions: true,
              },
            },
          },
        }),
        this.prisma.campaign.count({ where: { deletedAt: null } }),
      ]);

      return {
        campaigns,
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

  async findOne(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Manager)) {
        throw new ForbiddenException('Only admins and managers can view campaign details');
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
        include: {
          tasks: true,
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

      await this.prisma.campaign.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return {
        message: 'Campaign deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}