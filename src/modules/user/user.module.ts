import { PrismaModule } from '@modules/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtStrategy } from '@config/authentication/strategy/jwt.strategy';
import { MediaModule } from '@modules/media/media.module';

@Module({
  imports: [PrismaModule,MediaModule],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
  exports: [UserService],
})
export class UserModule {}
