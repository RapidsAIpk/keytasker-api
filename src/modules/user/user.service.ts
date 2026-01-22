import {
  checkPassword,
  encryptPassword,
  generateRandomPassword,
  sendEmail,
} from '@config/helpers';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { PrismaService } from '@modules/prisma/prisma.service';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { SortEnum } from '@config/constants';
import { SaveDeviceInfoDto } from './dto/save-device-info.dto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { LogoutDto } from './dto/logout.dto';
import { UserRole, AccountStatus, Prisma } from '@prisma/client';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MediaService } from '@modules/media/media.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async createAdmin(data: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists!');
      }

      const hashPassword: any = await encryptPassword(data.password);

      const newAdmin = await this.prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          password: hashPassword,
          role: UserRole.Admin,
          accountStatus: AccountStatus.Active,
          emailVerified: true,
        },
      });

      const { password, ...safeAdmin } = newAdmin;
      return safeAdmin;
    } catch (error) {
      throw error;
    }
  }

  async registerManager(data: {
    fullName: string;
    email: string;
    password: string;
  }) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists!');
      }

      const hashPassword: any = await encryptPassword(data.password);

      const newManager = await this.prisma.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          password: hashPassword,
          role: UserRole.Manager,
          accountStatus: AccountStatus.Active,
          emailVerified: true,
        },
      });

      const { password, ...safeManager } = newManager;
      return safeManager;
    } catch (error) {
      throw error;
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email.toLocaleLowerCase() },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'Email already exists',
        };
      }

      let hashPassword: any = await encryptPassword(registerDto.password);
      const emailVerificationCode = Math.floor(100000 + Math.random() * 900000);

      const user = await this.prisma.user.create({
        data: {
          fullName: registerDto.fullName,
          email: registerDto.email,
          password: hashPassword,
          profilePicture: registerDto.profilePicture,
          phoneNumber: registerDto.phoneNumber,
          country: registerDto.country,
          role: UserRole.User,
          accountStatus: AccountStatus.Active,
          emailVerificationCode: emailVerificationCode,
        },
      });

      console.log(
        `${emailVerificationCode} is your verification code Regards Key Tasker Team`,
      );

      try {
        await sendEmail(
          user.email,
          'Email Verification',
          `Hello ${user.fullName}, ${emailVerificationCode} is your verification code. Regards, Key Tasker Team`,
        );
      } catch (e) {
        console.error('Email send failed:', e);
      }

      return {
        success: true,
        message: 'email verification code sent successfully!',
      };
    } catch (error) {
      throw error;
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLocaleLowerCase() },
    });
    let updated: any;

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerificationCode !== dto.emailVerificationCode) {
      throw new BadRequestException('Invalid verification code');
    }

    updated = await this.prisma.user.update({
      where: { email: dto.email.toLocaleLowerCase() },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
      },
    });

    const { password, ...safeUser } = updated;

    return { safeUser };
  }

  async sendOtpToEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: emailVerificationCode,
      },
    });
    await sendEmail(
      user.email,
      'Email Verification',
      `Hello ${user.fullName},` +
        `${emailVerificationCode} is your verification code`,
    );
    return { success: true, message: 'Verification code sent to email' };
  }

  async getDeviceInfoByUserId(userId: string) {
    const devices = await this.prisma.deviceInfo.findMany({
      where: {
        userId: userId,
      },
    });

    if (!devices || devices.length === 0) {
      return null;
    }

    return devices;
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findFirst({
      where: {
        email: email.toLocaleLowerCase(),
      },
    });
  }

async update(updateUserDto: UpdateUserDto, file: Express.Multer.File, reqUser?: any) {
    try {
      const { fullName, phoneNumber, country } = updateUserDto;
console.log('updateUserDto:', updateUserDto);
      const existingUser = await this.prisma.user.findUnique({
        where: { id: reqUser.id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const updateData: any = {};

      if (fullName) updateData.fullName = fullName;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (country) updateData.country = country;

      if (file) {
        const uploadedMedia = await this.mediaService.create(file);
        console.log('profile uploaded:', uploadedMedia);
        updateData.profilePicture = uploadedMedia.fileUrl;
        updateData.mediaId = uploadedMedia.id;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: reqUser.id },
        data: updateData,
      });

      const { password, ...safeUpdatedUser } = updatedUser;
      return {
        updatedUser: safeUpdatedUser,
        message: 'User has been updated',
      };
    } catch (error) {
      throw error;
    }
  }

  async changePassword(req, changePasswordDto: ChangePasswordDto) {
    try {
      let user = await this.prisma.user.findUnique({
        where: {
          id: req.user.id,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new BadRequestException('User does not exist!');
      }

      if (!user.password) {
        throw new BadRequestException('User has no password set');
      }

      let matched: any = await checkPassword(
        changePasswordDto.password,
        user.password,
      );

      if (!matched) throw new BadRequestException('Old password is invalid');

      let hashPassword: any = await encryptPassword(
        changePasswordDto.newPassword,
      );

      await this.prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          password: hashPassword,
        },
      });

      return {
        message: 'Password has been changed successfully!',
      };
    } catch (error) {
      throw error;
    }
  }

  async saveDeviceInfo(saveDeviceInfoDto: SaveDeviceInfoDto) {
    try {
      const { userId, ipAddress, deviceInfo } = saveDeviceInfoDto;

      const existingDeviceInfo = await this.prisma.deviceInfo.findUnique({
        where: {
          userId: userId,
        },
      });

      if (existingDeviceInfo) {
        await this.prisma.deviceInfo.update({
          where: { userId: userId },
          data: {
            ipAddress: ipAddress,
            deviceInfo: deviceInfo,
            counter: {
              increment: 1,
            },
            status: 'Active',
          },
        });
      } else {
        await this.prisma.deviceInfo.create({
          data: {
            ipAddress: ipAddress,
            deviceInfo: deviceInfo,
            userId: userId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to save device info:', error);
      throw new Error('Failed to save device info');
    }
  }

  async findOneUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async getUserBalance(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalEarnings: true,
          pendingEarnings: true,
          withdrawnAmount: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        totalEarnings: user.totalEarnings,
        pendingEarnings: user.pendingEarnings,
        withdrawnAmount: user.withdrawnAmount,
        availableForWithdrawal: user.pendingEarnings,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserStats(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalEarnings: true,
          pendingEarnings: true,
          withdrawnAmount: true,
          tasksCompleted: true,
          tasksRejected: true,
          rejectionRate: true,
          canModerate: true,
          moderatorSince: true,
          moderatorVotes: true,
          moderatorAccuracy: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const [
        approvedSubmissions,
        pendingSubmissions,
        rejectedSubmissions,
        pendingPayments,
        completedPayments,
      ] = await Promise.all([
        this.prisma.taskSubmission.count({
          where: { userId, status: 'Approved' },
        }),
        this.prisma.taskSubmission.count({
          where: { userId, status: 'PendingModeration' },
        }),
        this.prisma.taskSubmission.count({
          where: { userId, status: 'Rejected' },
        }),
        this.prisma.payment.count({
          where: { userId, status: 'Pending' },
        }),
        this.prisma.payment.count({
          where: { userId, status: 'Completed' },
        }),
      ]);

      return {
        earnings: {
          totalEarnings: user.totalEarnings,
          pendingEarnings: user.pendingEarnings,
          withdrawnAmount: user.withdrawnAmount,
        },
        tasks: {
          completed: user.tasksCompleted,
          rejected: user.tasksRejected,
          rejectionRate: user.rejectionRate,
          approved: approvedSubmissions,
          pending: pendingSubmissions,
          totalSubmissions:
            approvedSubmissions + pendingSubmissions + rejectedSubmissions,
        },
        payments: {
          pending: pendingPayments,
          completed: completedPayments,
          total: pendingPayments + completedPayments,
        },
        moderation: {
          canModerate: user.canModerate,
          moderatorSince: user.moderatorSince,
          totalVotes: user.moderatorVotes,
          accuracy: user.moderatorAccuracy,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async createResetToken(userId: string, token: string, expiry: Date) {
    try {
      return await this.prisma.resetToken.create({
        data: {
          userId: userId,
          token: token,
          expiry: expiry,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async updateResetToken(tokenId: string, tx?: Prisma.TransactionClient) {
    try {
      let prisma: Prisma.TransactionClient = this.prisma;
      if (tx) {
        prisma = tx;
      }

      return await prisma.resetToken.update({
        where: {
          id: tokenId,
        },
        data: {
          isUsed: true,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(
    userId: string,
    newPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      let prisma: Prisma.TransactionClient = this.prisma;
      if (tx) {
        prisma = tx;
      }

      const hashPassword = (await encryptPassword(newPassword)) as string;

      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          password: hashPassword,
        },
      });

      const { password, ...safeUpdatedUser } = updatedUser;

      return {
        updatedUser: safeUpdatedUser,
        message: 'Password has been changed successfully!',
      };
    } catch (error) {
      throw error;
    }
  }

  findToken(userId: string, token: string) {
    return this.prisma.resetToken.findUnique({
      where: {
        userId: userId,
        token: token,
        isUsed: false,
      },
    });
  }
}
