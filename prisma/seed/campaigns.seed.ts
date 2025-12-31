import { PrismaService } from '@modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { TaskType, TaskStatus, Status } from '@prisma/client';

@Injectable()
export class CampaignTaskSeed {
  constructor(private readonly prisma: PrismaService) {}

  @Command({
    command: 'seed:campaigns',
    describe: 'Seed campaigns and tasks',
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

      // Email Campaign
      let emailCampaign = await this.prisma.campaign.findFirst({
        where: { name: 'Q1 2025 Email Response Testing' },
      });

      if (!emailCampaign) {
        emailCampaign = await this.prisma.campaign.create({
          data: {
            name: 'Q1 2025 Email Response Testing',
            description: 'Testing email responses from various companies for AI detection',
            status: Status.Active,
            createdBy: admin.id,
          },
        });
      }

      // Email Task 1
      const emailTask1Exists = await this.prisma.task.findFirst({
        where: {
          campaignId: emailCampaign.id,
          recipient: 'support@techcompany.com',
        },
      });

      if (!emailTask1Exists) {
        await this.prisma.task.create({
          data: {
            taskType: TaskType.Email,
            recipient: 'support@techcompany.com',
            topicInstruction: 'Ask if they sell laptops',
            detailedInstructions: 'Be polite and professional. Ask about their laptop inventory and if they offer bulk discounts.',
            basePayment: 1,
            bonusPayment: 4,
            totalQuantity: 20,
            campaignId: emailCampaign.id,
            status: TaskStatus.Active,
            createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
      }

      // Email Task 2
      const emailTask2Exists = await this.prisma.task.findFirst({
        where: {
          campaignId: emailCampaign.id,
          recipient: 'info@onlinestore.com',
        },
      });

      if (!emailTask2Exists) {
        await this.prisma.task.create({
          data: {
            taskType: TaskType.Email,
            recipient: 'info@onlinestore.com',
            topicInstruction: 'Ask about their return policy',
            detailedInstructions: 'Inquire about their return policy for electronics and ask if they offer free returns.',
            basePayment: 1,
            bonusPayment: 4,
            totalQuantity: 15,
            campaignId: emailCampaign.id,
            status: TaskStatus.Active,
            createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
      }

      // Fiverr Campaign
      let fiverrCampaign = await this.prisma.campaign.findFirst({
        where: { name: 'Fiverr Seller Communication Test' },
      });

      if (!fiverrCampaign) {
        fiverrCampaign = await this.prisma.campaign.create({
          data: {
            name: 'Fiverr Seller Communication Test',
            description: 'Testing Fiverr seller responses for AI-generated replies',
            status: Status.Active,
            createdBy: admin.id,
          },
        });
      }

      // Fiverr Task 1
      const fiverrTask1Exists = await this.prisma.task.findFirst({
        where: {
          campaignId: fiverrCampaign.id,
          recipient: 'graphic_designer_pro',
        },
      });

      if (!fiverrTask1Exists) {
        await this.prisma.task.create({
          data: {
            taskType: TaskType.Fiverr,
            recipient: 'graphic_designer_pro',
            topicInstruction: 'Ask if they offer rush delivery',
            detailedInstructions: 'Message the seller and ask if they can complete a logo design within 24 hours.',
            basePayment: 1,
            bonusPayment: 4,
            totalQuantity: 10,
            campaignId: fiverrCampaign.id,
            status: TaskStatus.Active,
            createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
      }

      // Fiverr Task 2
      const fiverrTask2Exists = await this.prisma.task.findFirst({
        where: {
          campaignId: fiverrCampaign.id,
          recipient: 'video_editor_expert',
        },
      });

      if (!fiverrTask2Exists) {
        await this.prisma.task.create({
          data: {
            taskType: TaskType.Fiverr,
            recipient: 'video_editor_expert',
            topicInstruction: 'Ask about their revision policy',
            detailedInstructions: 'Ask how many revisions are included and if they charge extra for additional revisions.',
            basePayment: 1,
            bonusPayment: 4,
            totalQuantity: 10,
            campaignId: fiverrCampaign.id,
            status: TaskStatus.Active,
            createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
      }

      // Social Media Campaign
      let socialCampaign = await this.prisma.campaign.findFirst({
        where: { name: 'Social Media Business Responses' },
      });

      if (!socialCampaign) {
        socialCampaign = await this.prisma.campaign.create({
          data: {
            name: 'Social Media Business Responses',
            description: 'Testing business responses on Instagram and TikTok',
            status: Status.Active,
            createdBy: admin.id,
          },
        });
      }

      // Instagram Task
      const instagramTaskExists = await this.prisma.task.findFirst({
        where: {
          campaignId: socialCampaign.id,
          recipient: '@business_account',
        },
      });

      if (!instagramTaskExists) {
        await this.prisma.task.create({
          data: {
            taskType: TaskType.Instagram,
            recipient: '@business_account',
            topicInstruction: 'Ask about their business hours',
            detailedInstructions: 'Send a DM asking what their business hours are and if they are open on weekends.',
            basePayment: 1,
            bonusPayment: 4,
            totalQuantity: 15,
            campaignId: socialCampaign.id,
            status: TaskStatus.Active,
            createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
      }

      // TikTok Task
      const tiktokTaskExists = await this.prisma.task.findFirst({
        where: {
          campaignId: socialCampaign.id,
          recipient: '@small_business',
        },
      });

      if (!tiktokTaskExists) {
        await this.prisma.task.create({
          data: {
            taskType: TaskType.TikTok,
            recipient: '@small_business',
            topicInstruction: 'Ask if they ship internationally',
            detailedInstructions: 'Message them asking if they ship to your country and what the shipping costs are.',
            basePayment: 1,
            bonusPayment: 4,
            totalQuantity: 10,
            campaignId: socialCampaign.id,
            status: TaskStatus.Active,
            createdBy: admin.id,
            publishedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error seeding campaigns and tasks:', error);
    }
  }
}