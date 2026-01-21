import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { SortEnum } from '@config/constants';
import { sendEmail } from '@config/helpers';
import { NotificationType } from '@prisma/client';
@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user's notifications
   */
  async findAll({ page, limit, sortDto, filters }: FindNotificationsDto, userId: string) {
    try {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const skip = (pageNumber - 1) * pageSize;

      const where: any = {
        userId,
        deletedAt: null,
      };

      if (filters) {
        if (filters.type) where.type = filters.type;
        if (filters.isRead !== undefined) where.isRead = filters.isRead;
      }

      let totalCount = await this.prisma.notification.count({ where });

      let orderBy: any = {};
      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const notifications = await this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      });

      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
      });

      return {
        totalCount,
        unreadCount,
        notifications,
        page: pageNumber,
        limit: pageSize,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new BadRequestException('This notification does not belong to you');
      }

      const updated = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return {
        message: 'Notification marked as read',
        notification: updated,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
          deletedAt: null,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return {
        message: 'All notifications marked as read',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async remove(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new BadRequestException('This notification does not belong to you');
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { deletedAt: new Date() },
      });

      return {
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    try {
      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
      });

      return { unreadCount };
    } catch (error) {
      throw error;
    }
  }

// Add these methods to the NotificationService class

/**
 * Create notification (for internal use)
 */
async createNotification(data: {
  userId: string;
  type: NotificationType; // ← Use the enum type
  title: string;
  message: string;
  sendEmail?: boolean;
  userEmail?: string;
}) {
  try {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type, // ← Now it's properly typed
        title: data.title,
        message: data.message,
      },
    });

    if (data.sendEmail && data.userEmail) {
      try {
        await sendEmail(
          data.userEmail,
          data.title,
          data.message,
        );
      } catch (error) {
        console.error('Email sending failed:', error.message);
      }
    }

    return notification;
  } catch (error) {
    throw error;
  }
}

/**
 * Track WebSocket connection
 */
async trackConnection(userId: string, socketId: string, deviceInfo: string) {
  try {
    return await this.prisma.userConnection.create({
      data: {
        userId,
        socketId,
        deviceInfo,
      },
    });
  } catch (error) {
    console.error('Failed to track connection:', error);
  }
}

/**
 * Track WebSocket disconnection
 */
async trackDisconnection(socketId: string) {
  try {
    return await this.prisma.userConnection.updateMany({
      where: {
        socketId,
        isActive: true,
      },
      data: {
        isActive: false,
        disconnectedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to track disconnection:', error);
  }
}

/**
 * Get active connections for a user
 */
async getActiveConnections(userId: string) {
  try {
    return await this.prisma.userConnection.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
  } catch (error) {
    return [];
  }
}

}
