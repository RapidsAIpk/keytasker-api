import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { SubmitIdeaDto } from './dto/submit-idea.dto';
import { ReviewIdeaDto } from './dto/review-idea.dto';
import { FindIdeasDto } from './dto/find-ideas.dto';
import { FindMyIdeasDto } from './dto/find-my-ideas.dto';
import { UserRole } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class IdeaService {
  constructor(private prisma: PrismaService) {}

  async submitIdea(submitDto: SubmitIdeaDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const settings = await this.prisma.platformSettings.findFirst();
      if (!settings?.allowUserIdeas) {
        throw new BadRequestException('User idea submissions are currently disabled');
      }

      const idea = await this.prisma.userIdea.create({
        data: {
          userId,
          title: submitDto.title,
          description: submitDto.description,
          category: submitDto.category || 'General',
          status: 'Pending',
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'IdeaReviewed',
          title: 'Idea Submitted',
          message: `Your idea "${idea.title}" has been submitted for review.`,
          link: `/ideas/${idea.id}`,
        },
      });

      return {
        message: 'Idea submitted successfully',
        idea,
      };
    } catch (error) {
      throw error;
    }
  }

  async reviewIdea(reviewDto: ReviewIdeaDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException('Only admins and managers can review ideas');
      }

      const idea = await this.prisma.userIdea.findUnique({
        where: { id: reviewDto.ideaId },
        include: { user: true },
      });

      if (!idea) {
        throw new NotFoundException('Idea not found');
      }

      const updatedIdea = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.userIdea.update({
          where: { id: reviewDto.ideaId },
          data: {
            status: reviewDto.status,
            reviewedBy: userId,
            reviewNotes: reviewDto.reviewNotes,
            reviewedAt: new Date(),
          },
        });

        await tx.notification.create({
          data: {
            userId: idea.userId,
            type: 'IdeaReviewed',
            title: 'Idea Reviewed',
            message: `Your idea "${idea.title}" has been ${reviewDto.status.toLowerCase()}. ${reviewDto.reviewNotes || ''}`,
            link: `/ideas/${idea.id}`,
          },
        });

        return updated;
      });

      return {
        message: 'Idea reviewed successfully',
        idea: updatedIdea,
      };
    } catch (error) {
      throw error;
    }
  }

  async findAll({ page, limit, sortDto, filters }: FindIdeasDto, req: any) {
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
        if (filters.category) where.category = filters.category;
      }

      let totalCount = await this.prisma.userIdea.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const ideas = await this.prisma.userIdea.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      return {
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: pageNumber,
        pageSize,
        ideas,
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

      const idea = await this.prisma.userIdea.findUnique({
        where: { id, deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (!idea) {
        throw new NotFoundException('Idea not found');
      }

      if (user?.role === UserRole.User && idea.userId !== userId) {
        throw new ForbiddenException('You can only view your own ideas');
      }

      return idea;
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
          'Only admins and managers can view idea statistics',
        );
      }

      const [
        totalIdeas,
        pendingIdeas,
        approvedIdeas,
        rejectedIdeas,
        implementedIdeas,
      ] = await Promise.all([
        this.prisma.userIdea.count(),
        this.prisma.userIdea.count({ where: { status: 'Pending' } }),
        this.prisma.userIdea.count({ where: { status: 'Approved' } }),
        this.prisma.userIdea.count({ where: { status: 'Rejected' } }),
        this.prisma.userIdea.count({ where: { status: 'Implemented' } }),
      ]);

      return {
        totalIdeas,
        pendingIdeas,
        approvedIdeas,
        rejectedIdeas,
        implementedIdeas,
      };
    } catch (error) {
      throw error;
    }
  }

  async getMyIdeas(
    { page, limit, sortDto, filters }: FindMyIdeasDto,
    userId: string,
  ) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = { userId, deletedAt: null };

      if (filters) {
        if (filters.status) where.status = filters.status;
      }

      const totalCount = await this.prisma.userIdea.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const ideas = await this.prisma.userIdea.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      });

      return {
        ideas,
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