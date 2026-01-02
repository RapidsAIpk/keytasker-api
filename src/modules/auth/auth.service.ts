import { checkPassword, sendEmail } from '@config/helpers';
import { PrismaService } from '@modules/prisma/prisma.service';
import { SaveDeviceInfoDto } from '@modules/user/dto/save-device-info.dto';
import { UserService } from '@modules/user/user.service';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LogoutDto } from '../user/dto/logout.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole, AccountStatus, Prisma } from '@prisma/client';
// import { adminUrl, ownerUrl } from '@config/env';
import { ResetPasswordDto } from './dto/reset-password.dto';
import e from 'express';
import { VerifyEmailDto } from '@modules/user/dto/verify-email.dto';
const frontendUrl = process.env.FRONTEND_URL;
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

async register(registerDto: RegisterDto) {
  const user = await this.userService.register(registerDto);
  if (user.success){
    return {message:user.message,success:true};
  }else{
    return {message:user.message,success:false};
  }
}
    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.userService.verifyEmail(verifyEmailDto);
    
    return {
      userDto: user.safeUser,
      accessToken: this.getAccessToken(user.safeUser, false),
    };
  }
  async login(loginDto: LoginDto, req: any) {
    try {
      const ipAddress = req.ip;
      const deviceInfo = req.headers['user-agent'];

      const user = await this.validateUser(loginDto);

      if (!user) {
        throw new BadRequestException('Invalid credentials');
      }

      const saveDeviceInfoDto: SaveDeviceInfoDto = {
        userId: user.id,
        ipAddress: ipAddress,
        deviceInfo: deviceInfo,
      };

      await this.userService.saveDeviceInfo(saveDeviceInfoDto);

      const accessToken = this.getAccessToken(user, loginDto.rememberMe || false);

      return {
        accessToken: accessToken,
        userDto: { ...user },
      };
    } catch (error) {
      throw error;
    }
  }
  async validateUser({ email, password }: LoginDto): Promise<any> {
    const result = await this.userService.findByEmail(email);

    if (!result) {
      throw new UnauthorizedException('Invalid email address');
    }

    const { password: userPassword, ...user } = result;

    if (!userPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    let result1 = await checkPassword(password, userPassword);

    if (!result1) {
      throw new UnauthorizedException('Invalid password');
    }

    return user;
  }
  async logout(logoutDto: LogoutDto, userId: string) {
    try {
      const { deviceInfo } = logoutDto;
      const existingDeviceInfo = await this.prisma.deviceInfo.findFirst({
        where: {
          userId,
          deviceInfo,
          status: 'Active',
        },
      });
      if (existingDeviceInfo) {
        await this.prisma.deviceInfo.update({
          where: { id: existingDeviceInfo.id },
          data: {
            status: 'InActive',
          },
        });
      }
    } catch (error) {
      throw new Error('Failed to update device info status');
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new BadRequestException('User with this email does not exist!');
      }

      if (
        user.accountStatus === AccountStatus.Banned ||
        user.accountStatus === AccountStatus.Suspended
      ) {
        throw new HttpException(
          'Your account has been blocked, please contact the admin',
          HttpStatus.FORBIDDEN,
        );
      }
      if (user.role === UserRole.Admin) {
        throw new HttpException(
          'Admins are not allowed to reset password from here',
          HttpStatus.FORBIDDEN,
        );
      }
      const resetToken = await this.getAccessToken({ userId: user.id }, false);

      let resetTokenExpiry = new Date(Date.now() + 3600000);
      await this.userService.createResetToken(
        user.id,
        resetToken,
        resetTokenExpiry,
      );

      // let portalUrl;
      // if (user.role === UserRole.Admin) {
      //   portalUrl = adminUrl;
      // } else if (user.UserRole === UserRole.Peer) {
      //   portalUrl = ownerUrl;
      // }

      await sendEmail(
        user.email,
        'Reset password',
        `Follow the link below to reset your password:
        http://localhost:3000/update-password?id=${user.id}&token=${resetToken}`,
      );
      console.log(`Follow the link below to reset your password:
      ${frontendUrl}/auth/reset-password?id=${user.id}&token=${resetToken}`);

      // await sendEmail(
      //   user.email,
      //   'Reset password',
      //   `Follow the link below to reset your password:
      //     ${portalUrl}/auth/reset-password?id=${user.id}&token=${resetToken}`,
      // );

      return {
        message: 'Reset password email sent successfully!',
      };
    } catch (error) {
      throw error;
    }
  }

  async findResetPasswordToken(userId: string, token: string) {
    try {
      const findToken = await this.userService.findToken(userId, token);
      if (!findToken) {
        throw new BadRequestException('Invalid link or link has expired!');
      }

      return findToken;
    } catch (error) {
      throw error;
    }
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      return await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const user = await this.userService.findOneUser(
            resetPasswordDto.userId,
          );
          if (!user) {
            throw new BadRequestException('User not found!');
          }

          const token = await this.userService.findToken(
            resetPasswordDto.userId,
            resetPasswordDto.token,
          );
          if (!token) {
            throw new BadRequestException('Invalid link or link has expired!');
          }

          const decodedToken = await this.verifyToken(resetPasswordDto.token);
          if (
            !decodedToken ||
            decodedToken.userId !== resetPasswordDto.userId
          ) {
            throw new BadRequestException('Invalid reset password token.');
          }

          await this.userService.updateResetToken(token.id, tx);

          await this.userService.resetPassword(
            resetPasswordDto.userId,
            resetPasswordDto.newPassword,
            tx,
          );

          const newUser = user;

          return {
            access_token: this.getAccessToken(newUser, false),
            newUser,
            message: 'User is logged in successfully!',
          };
        },
        {
          maxWait: 500000,
          timeout: 100000,
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async findAccountProviderId(providerAccountId: string) {
    const resp = await this.prisma.user.findFirst({
      where: {
        id: providerAccountId,
      },
    });
    console.log('resp', resp);
    return {
      accessToken: this.getAccessToken(resp , false),
      userDto: resp,
    };
  }

  verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token);
  }

  getAccessToken(params: any, rememberMe: boolean = false): string {
    const options = {
      expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    };
    return this.jwtService.sign(params, options);
  }
}
