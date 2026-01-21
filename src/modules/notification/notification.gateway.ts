import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '@config/authentication/guards/ws-jwt.guard';
import { NotificationService } from './notification.service';
import { SortEnum } from '@config/constants';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.id;

      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }

      this.userSockets.get(userId)?.add(client.id);

      await this.notificationService.trackConnection(
        userId,
        client.id,
        client.handshake.headers['user-agent'] || 'unknown',
      );

      client.join(`user:${userId}`);

      const unreadCount = await this.notificationService.getUnreadCount(userId);
      client.emit('unread_count', unreadCount);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      await this.notificationService.trackDisconnection(client.id);
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page?: number; limit?: number },
  ) {
    const userId = client.data.userId;
    const result = await this.notificationService.findAll(
      {
        page: data.page || 1,
        limit: data.limit || 20,
        sortDto: {
          name: 'createdAt',
          sort: SortEnum.Desc,
        },
      },
      userId,
    );
    return { event: 'notifications', data: result };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    const userId = client.data.userId;
    await this.notificationService.markAsRead(data.notificationId, userId);
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    client.emit('unread_count', unreadCount);
    return { event: 'marked_read', data: { success: true } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.notificationService.markAllAsRead(userId);
    client.emit('unread_count', { unreadCount: 0 });
    return { event: 'marked_all_read', data: { success: true } };
  }

  async sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('unread_count', unreadCount);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return client.handshake.auth?.token || client.handshake.query?.token || null;
  }

  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId) ?? new Set();
    return sockets.size > 0;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}