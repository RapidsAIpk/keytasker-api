import { PrismaService } from '@modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';

@Injectable()
export class PlatformSettingsSeed {
  constructor(private readonly prisma: PrismaService) {}

  @Command({
    command: 'seed:settings',
    describe: 'Seed platform settings',
  })
  async create() {
    try {
      const admin = await this.prisma.user.findFirst({
        where: { role: 'Admin' },
      });

      if (!admin) {
        console.error('Admin user not found. Please run seed:users first');
        return;
      }

      const existingSettings = await this.prisma.platformSettings.findFirst();

      if (existingSettings) {
        await this.prisma.platformSettings.update({
          where: { id: existingSettings.id },
          data: {
            minimumWithdrawal: 10,
            baseTaskPayment: 1,
            bonusTaskPayment: 4,
            moderationFeePerVote: 0.05,
            moderatorMinimumEarnings: 25,
            suspensionThreshold: 0.25,
            moderatorAccuracyMin: 0.75,
            minVotesRequired: 3,
            maxVotesRequired: 5,
            taskReservationMinutes: 60,
            moderationTimeoutHours: 24,
            allowTaskReservations: true,
            allowUserIdeas: true,
            maintenanceMode: false,
            updatedBy: admin.id,
          },
        });
      } else {
        await this.prisma.platformSettings.create({
          data: {
            minimumWithdrawal: 10,
            baseTaskPayment: 1,
            bonusTaskPayment: 4,
            moderationFeePerVote: 0.05,
            moderatorMinimumEarnings: 25,
            suspensionThreshold: 0.25,
            moderatorAccuracyMin: 0.75,
            minVotesRequired: 3,
            maxVotesRequired: 5,
            taskReservationMinutes: 60,
            moderationTimeoutHours: 24,
            allowTaskReservations: true,
            allowUserIdeas: true,
            maintenanceMode: false,
            updatedBy: admin.id,
          },
        });
      }
    } catch (error) {
      console.error('Error seeding platform settings:', error);
    }
  }
}