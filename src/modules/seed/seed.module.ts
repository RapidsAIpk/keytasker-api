import { MediaModule } from '@modules/media/media.module';
import { UserModule } from '@modules/user/user.module';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { Module } from '@nestjs/common';
// import { UserSeed } from '@seed/user.seed';

import { CommandModule } from 'nestjs-command';
import { PlatformSettingsSeed } from '@seed/settings.seed';
import { CampaignTaskSeed } from '@seed/campaigns.seed';
import { UserSeed } from '@seed/users.seed';

@Module({
  imports: [CommandModule, UserModule, PrismaModule, MediaModule],
  providers: [ PlatformSettingsSeed, CampaignTaskSeed, UserSeed],
})
export class SeedsModule {}