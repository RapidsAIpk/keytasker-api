import { UserService } from '@modules/user/user.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Command } from 'nestjs-command';

@Injectable()
export class UserSeed {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Command({
    command: 'seed:users',
    describe: 'Seed users',
  })
  async create() {
    try {
      // Admin User
      const adminExists = await this.prisma.user.findUnique({
        where: { email: 'admin@keytasker.com' },
      });

      if (!adminExists) {
        await this.userService.createAdmin({
          firstName: 'Keytasker',
          lastName: 'Admin',
          userName: 'admin',
          email: 'admin@keytasker.com',
          password: 'Admin123!',
          role: UserRole.Admin,
        });
      }

      // Manager User
      const managerExists = await this.prisma.user.findUnique({
        where: { email: 'manager@keytasker.com' },
      });

      if (!managerExists) {
        await this.userService.registerManager({
          firstName: 'Site',
          lastName: 'Manager',
          userName: 'manager',
          email: 'manager@keytasker.com',
          password: 'Manager123!',
        });
      }

      // Test User
      const userExists = await this.prisma.user.findUnique({
        where: { email: 'user@keytasker.com' },
      });

      if (!userExists) {
        await this.userService.register({
          firstName: 'Test',
          lastName: 'User',
          userName: 'testuser',
          email: 'user@keytasker.com',
          password: 'User123!',
        });
      }
    } catch (error) {
      console.error('Error seeding users:', error);
    }
  }
}