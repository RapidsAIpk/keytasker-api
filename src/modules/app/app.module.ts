import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MediaModule } from '@modules/media/media.module';
import { SeedsModule } from '@modules/seed/seed.module';
import { TaskModule } from '@modules/task/task.module';
import { SubmissionModule } from '@modules/submission/submission.module';
import { CampaignModule } from '@modules/campaign/campaign.module';


@Module({
  imports: [
    UserModule,
    AuthModule,
    MediaModule,
    SeedsModule,
    TaskModule,
    SubmissionModule,
    CampaignModule,
    // ModerationModule,
    // PaymentsModule,
    // SupportModule,
    // AdminModule,
    // AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
