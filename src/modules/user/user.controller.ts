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
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { SaveDeviceInfoDto } from './dto/save-device-info.dto';
import { LogoutDto } from './dto/logout.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FindOneUsersDto } from './dto/find-one-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FindDeletedUsersDto } from './dto/find-deleted-users.dto';

@ApiBearerAuth()
@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) { }

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
  @Get('deviceInfo/:id')
  async getDeviceInfoById(@Param('  ') id: string) {
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
  changePassword(
    @Request()
    req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(req, changePasswordDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update-profile')
  async updateProfile(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('find-all-users')
  findAllUsers(@Request() req, @Body() findAllUsersDto: FindAllUsersDto) {
    return this.userService.findAllUsers(findAllUsersDto, req);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('find-all-deleted-users')
  findAllDeletedUsers(
    @Request() req: any,
    @Body() findDeletedUsersDto: FindDeletedUsersDto,
  ) {
    return this.userService.findAllDeletedUsers(findDeletedUsersDto, req);
  }
@UseGuards(JwtAuthGuard)
@Patch('restore/:id')
restore(@Param('id') id: string, @Request() req: any) {
  return this.userService.restore(id, req.user);
}

  @Get(':id')
  findOneUser(@Param('id') id: string) {
    return this.userService.findOneUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user-status')
  updateUserStatus(
    @Request() req: any,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    const userId = req.user.id;
    return this.userService.updateUserStatus(updateUserStatusDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('save-device-info')
  async saveDeviceInfo(@Body() saveDeviceInfoDto: SaveDeviceInfoDto) {
    return this.userService.saveDeviceInfo(saveDeviceInfoDto);
  }



  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
