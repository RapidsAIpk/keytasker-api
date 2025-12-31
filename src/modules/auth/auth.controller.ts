import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import { LocalAuthGuard } from '@config/authentication/guards/local-auth.guard';
import { LogoutDto } from '@modules/user/dto/logout.dto';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Request() req: any, @Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto, req);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Body() logoutDto: LogoutDto) {
    try {
      const userId = req.user.id;
      await this.authService.logout(logoutDto, userId);
      return { message: 'Logout successful' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to logout');
    }
  }

  @Get('forgot-password/:email')
  forgotPassword(@Param('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Get('reset-password-token/:userId/:token')
  findResetPasswordToken(
    @Param('userId') userId: string,
    @Param('token') token: string,
  ) {
    return this.authService.findResetPasswordToken(userId, token);
  }

  @Patch('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('check-provider-account-id/:id')
  findAccountProviderId(@Param('id') id: string) {
    return this.authService.findAccountProviderId(id);
  }
}
