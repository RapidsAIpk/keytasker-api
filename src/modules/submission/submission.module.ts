import { Module } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { MediaModule } from '@modules/media/media.module';

@Module({
  imports: [PrismaModule,MediaModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
})
export class SubmissionModule {}
