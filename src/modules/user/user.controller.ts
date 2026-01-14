import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
  Delete,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { SaveDeviceInfoDto } from './dto/save-device-info.dto';
import { LogoutDto } from './dto/logout.dto';
import { FindOneUsersDto } from './dto/find-one-users.dto';
import { FindDeletedUsersDto } from '../admin/dto/find-deleted-users.dto';

@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('')
  async get(@Request() req) {
    const user = await this.userService.findByEmail(req.user.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userDto } = user;

    return userDto;
  }

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  @ApiOperation({ summary: 'Get user balance and earnings' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@Request() req) {
    return this.userService.getUserBalance(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.userService.getUserStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('deviceInfo/:id')
  @ApiParam({ name: 'id', description: 'User ID' })
  async getDeviceInfoById(@Param('id') id: string) {
    try {
      const devices = await this.userService.getDeviceInfoByUserId(id);
      return devices;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('User not found');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.userService.changePassword(req, changePasswordDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update-profile')
  async updateProfile(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto);
  }

  @Get(':id')
  findOneUser(@Param('id') id: string) {
    return this.userService.findOneUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('save-device-info')
  async saveDeviceInfo(@Body() saveDeviceInfoDto: SaveDeviceInfoDto) {
    return this.userService.saveDeviceInfo(saveDeviceInfoDto);
  }
}