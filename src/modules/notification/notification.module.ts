import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module'; // ← IMPORT AuthModule

@Module({
  imports: [
    PrismaModule,
    AuthModule, // ← USE AuthModule (which exports JwtModule)
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}