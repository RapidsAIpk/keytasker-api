import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { RespondTicketDto } from './dto/respond-ticket.dto';
import { FindTicketsDto, UpdateTicketStatusDto } from './dto/find-tickets.dto';
import { UserRole } from '@prisma/client';
import { SortEnum } from '@config/constants';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new support ticket
   */
  async createTicket(createDto: CreateTicketDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const ticket = await this.prisma.supportTicket.create({
        data: {
          userId,
          subject: createDto.subject,
          message: createDto.message,
          category: createDto.category || 'General',
          priority: createDto.priority || 'Medium',
          status: 'Open',
        },
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

      // Create notification for admins/managers (could be improved with role-based targeting)
      await this.prisma.notification.create({
        data: {
          userId: userId, // Placeholder - in production, notify admin/manager
          type: 'SupportResponse',
          title: 'Support Ticket Created',
          message: `Your support ticket "${ticket.subject}" has been created.`,
          link: `/support/${ticket.id}`,
        },
      });

      return {
        message: 'Support ticket created successfully',
        ticket,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Respond to a support ticket
   */
  async respondToTicket(respondDto: RespondTicketDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: respondDto.ticketId },
        include: { user: true },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Check permissions for staff responses
      const isStaffResponse =
        respondDto.isStaffResponse &&
        (user.role === UserRole.Admin || user.role === UserRole.Manager);

      // Users can only respond to their own tickets (non-staff responses)
      if (!isStaffResponse && ticket.userId !== userId) {
        throw new ForbiddenException('You can only respond to your own tickets');
      }

      const response = await this.prisma.$transaction(async (tx) => {
        const newResponse = await tx.ticketResponse.create({
          data: {
            ticketId: respondDto.ticketId,
            responderId: userId,
            message: respondDto.message,
            isStaffResponse,
          },
          include: {
            responder: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
        });

        // Update ticket status if it was resolved
        if (ticket.status === 'Open') {
          await tx.supportTicket.update({
            where: { id: respondDto.ticketId },
            data: { status: 'InProgress' },
          });
        }

        // Create notification for ticket owner if staff responded
        if (isStaffResponse && ticket.userId !== userId) {
          await tx.notification.create({
            data: {
              userId: ticket.userId,
              type: 'SupportResponse',
              title: 'New Support Response',
              message: `Your support ticket "${ticket.subject}" has a new response.`,
              link: `/support/${ticket.id}`,
            },
          });
        }

        return newResponse;
      });

      return {
        message: 'Response added successfully',
        response,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all tickets (Admin/Manager view all, Users view own)
   */
  async findAll({ page, limit, sortDto, filters }: FindTicketsDto, req: any) {
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

      // Regular users can only see their own tickets
      if (user.role === UserRole.User) {
        where.userId = req.user.id;
      }

      // Apply filters
      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.priority) where.priority = filters.priority;
        if (filters.category) where.category = filters.category;
      }

      let totalCount = await this.prisma.supportTicket.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const tickets = await this.prisma.supportTicket.findMany({
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
          _count: {
            select: {
              responses: true,
            },
          },
        },
      });

      return {
        totalCount,
        tickets,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single ticket with responses
   */
  async findOne(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id, deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          responses: {
            orderBy: { createdAt: 'asc' },
            include: {
              responder: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Users can only view their own tickets
      if (user?.role === UserRole.User && ticket.userId !== userId) {
        throw new ForbiddenException('You can only view your own tickets');
      }

      return ticket;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update ticket status (Admin/Manager only)
   */
  async updateStatus(updateDto: UpdateTicketStatusDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can update ticket status',
        );
      }

      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: updateDto.ticketId },
        include: { user: true },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicket = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.supportTicket.update({
          where: { id: updateDto.ticketId },
          data: {
            status: updateDto.status,
            ...(updateDto.assignedTo && { assignedTo: updateDto.assignedTo }),
            ...(updateDto.status === 'Resolved' && { resolvedAt: new Date() }),
            ...(updateDto.status === 'Closed' && { resolvedAt: new Date() }),
          },
        });

        // Create notification
        if (updateDto.status === 'Resolved' || updateDto.status === 'Closed') {
          await tx.notification.create({
            data: {
              userId: ticket.userId,
              type: 'SupportResponse',
              title: 'Ticket Resolved',
              message: `Your support ticket "${ticket.subject}" has been ${updateDto.status.toLowerCase()}.`,
              link: `/support/${ticket.id}`,
            },
          });
        }

        return updated;
      });

      return {
        message: 'Ticket status updated successfully',
        ticket: updatedTicket,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get support statistics (Admin/Manager only)
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
          'Only admins and managers can view support statistics',
        );
      }

      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        highPriorityTickets,
      ] = await Promise.all([
        this.prisma.supportTicket.count(),
        this.prisma.supportTicket.count({ where: { status: 'Open' } }),
        this.prisma.supportTicket.count({ where: { status: 'InProgress' } }),
        this.prisma.supportTicket.count({ where: { status: 'Resolved' } }),
        this.prisma.supportTicket.count({ where: { status: 'Closed' } }),
        this.prisma.supportTicket.count({
          where: { priority: { in: ['High', 'Urgent'] } },
        }),
      ]);

      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        highPriorityTickets,
        pendingTickets: openTickets + inProgressTickets,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get my tickets (Users)
   */
  async getMyTickets(userId: string, page: number = 1, limit: number = 20) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const [tickets, totalCount] = await Promise.all([
        this.prisma.supportTicket.findMany({
          where: { userId, deletedAt: null },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                responses: true,
              },
            },
          },
        }),
        this.prisma.supportTicket.count({
          where: { userId, deletedAt: null },
        }),
      ]);

      return {
        tickets,
        totalCount,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }
}
