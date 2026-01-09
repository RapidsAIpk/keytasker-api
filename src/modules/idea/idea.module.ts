import { Module } from '@nestjs/common';
import { IdeaService } from './idea.service';
import { IdeaController } from './idea.controller';
import { PrismaModule } from '@modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IdeaController],
  providers: [IdeaService],
  exports: [IdeaService],
})
export class IdeaModule {}
