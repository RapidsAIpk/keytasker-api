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
import { ModerationModule } from '@modules/moderation/moderation.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { SupportModule } from '@modules/support/support.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { IdeaModule } from '@modules/idea/idea.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { AdminModule } from '@modules/admin/admin.module';
@Module({
  imports: [
    UserModule,
    AuthModule,
    MediaModule,
    SeedsModule,
    TaskModule,
    SubmissionModule,
    CampaignModule,
 ModerationModule,
    PaymentModule,
    SupportModule,
    NotificationModule,
    IdeaModule,
    SettingsModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
