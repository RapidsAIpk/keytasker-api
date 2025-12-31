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
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole, AccountStatus, Prisma } from '@prisma/client';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createAdmin(data: {
    firstName: string;
    lastName: string;
    userName: string;
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
          firstName: data.firstName,
          lastName: data.lastName,
          userName: data.userName,
          email: data.email,
          password: hashPassword,
          role: UserRole.Admin,
          accountStatus: AccountStatus.Active,
        },
      });

      const { password, ...safeAdmin } = newAdmin;
      return safeAdmin;
    } catch (error) {
      throw error;
    }
  }

  async registerManager(data: {
    firstName: string;
    lastName: string;
    userName: string;
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
          firstName: data.firstName,
          lastName: data.lastName,
          userName: data.userName,
          email: data.email,
          password: hashPassword,
          role: UserRole.Manager,
          accountStatus: AccountStatus.Active,
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
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      let hashPassword: any = await encryptPassword(registerDto.password);

      const user = await this.prisma.user.create({
        data: {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          userName: registerDto.userName,
          email: registerDto.email,
          password: hashPassword,
          profilePicture: registerDto.profilePicture,
          phoneNumber: registerDto.phoneNumber,
          country: registerDto.country,
          role: UserRole.User,
          accountStatus: AccountStatus.Active,
        },
      });

      return user;
    } catch (error) {
      throw error;
    }
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
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async update(updateUserDto: UpdateUserDto) {
    try {
      const { id, email, firstName, lastName, userName, profilePicture, phoneNumber, country } = updateUserDto;

      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const userWithEmail = await this.findByEmail(email);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new BadRequestException('User with this email already exists!');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          userName,
          email,
          profilePicture,
          phoneNumber,
          country,
        },
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

  async findAllUsers({ page, sortDto }: FindAllUsersDto, req) {
    try {
      let totalCount = await this.prisma.user.count({
        where: { deletedAt: null },
      });

      let orderBy: any = {};

      if (sortDto?.sort && sortDto?.sort !== 'none')
        orderBy[sortDto.name] = sortDto.sort;
      else orderBy['createdAt'] = SortEnum.Desc;

      const filteredUsers = await this.prisma.user.findMany({
        where: { deletedAt: null },
        skip: page ? (page - 1) * 10 : 0,
        take: page ? 10 : undefined,
        orderBy,
      });

      const users = filteredUsers.map(({ password, ...u }) => u);

      return {
        totalCount,
        users,
      };
    } catch (error) {
      throw error;
    }
  }

  async saveDeviceInfo(saveDeviceInfoDto: SaveDeviceInfoDto) {
    try {
      const { userId, ipAddress, deviceInfo } = saveDeviceInfoDto;
      const existingDeviceInfo = await this.prisma.deviceInfo.findFirst({
        where: {
          userId,
          deviceInfo,
        },
      });

      if (existingDeviceInfo) {
        await this.prisma.deviceInfo.update({
          where: { id: existingDeviceInfo.id },
          data: {
            counter: {
              increment: 1,
            },
            status: 'Active',
          },
        });
      } else {
        await this.prisma.deviceInfo.create({
          data: {
            ipAddress,
            deviceInfo,
            userId,
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

  async updateUserStatus(
    updateUserStatusDto: UpdateUserStatusDto,
    userId: string,
  ) {
    try {
      const adminCheck = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (adminCheck?.role !== UserRole.Admin) {
        throw new BadRequestException('You dont have Permission');
      }

      const updatedUserStatus = await this.prisma.user.update({
        where: {
          id: updateUserStatusDto.id,
        },
        data: {
          accountStatus: updateUserStatusDto.accountStatus,
        },
      });

      const { password, ...safeUpdatedUserStatus } = updatedUserStatus;

      return {
        updatedUserStatus: safeUpdatedUserStatus,
        message: 'User status has been updated',
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

  async remove(id: string) {
    try {
      const removedUser = await this.prisma.user.update({
        where: {
          id: id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        message: 'User has been deleted successfully!',
        removedUser,
      };
    } catch (error) {
      throw error;
    }
  }
}