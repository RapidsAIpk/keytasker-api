import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get platform settings
   */
  async getSettings(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (
        !user ||
        (user.role !== UserRole.Admin && user.role !== UserRole.Manager)
      ) {
        throw new ForbiddenException(
          'Only admins and managers can view platform settings',
        );
      }

      const settings = await this.prisma.platformSettings.findFirst();

      if (!settings) {
        throw new NotFoundException('Platform settings not found');
      }

      return settings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update platform settings (Admin only)
   */
  async updateSettings(updateDto: UpdateSettingsDto, userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.role !== UserRole.Admin) {
        throw new ForbiddenException('Only admins can update platform settings');
      }

      const existingSettings = await this.prisma.platformSettings.findFirst();

      if (!existingSettings) {
        throw new NotFoundException('Platform settings not found');
      }

      const updatedSettings = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.platformSettings.update({
          where: { id: existingSettings.id },
          data: {
            ...updateDto,
            updatedBy: userId,
          },
        });

        // Log activity
        // await tx.activityLog.create({
        //   data: {
        //     userId,
        //     activityType: 'SettingsChanged',
        //     description: 'Updated platform settings',
        //     metadata: {
        //       changes: updateDto,
        //     },
        //   },
        // });

        return updated;
      });

      return {
        message: 'Settings updated successfully',
        settings: updatedSettings,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get public settings (accessible by all users)
   */
  async getPublicSettings() {
    try {
      const settings = await this.prisma.platformSettings.findFirst({
        select: {
          minimumWithdrawal: true,
          baseTaskPayment: true,
          bonusTaskPayment: true,
          moderationFeePerVote: true,
          moderatorMinimumEarnings: true,
          taskReservationMinutes: true,
          allowTaskReservations: true,
          allowUserIdeas: true,
          maintenanceMode: true,
        },
      });

      return settings || {};
    } catch (error) {
      throw error;
    }
  }
}
