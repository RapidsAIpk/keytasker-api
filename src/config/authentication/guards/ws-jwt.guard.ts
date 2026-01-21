import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const userId = client.data.userId;

      if (!userId) {
        throw new WsException('Unauthorized');
      }

      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }
}