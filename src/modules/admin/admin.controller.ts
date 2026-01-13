import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuspendUserDto, ModeratorAccessDto } from './dto/suspend-user.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  AdminUpdateUserDto,
  AdminUpdateUserPasswordDto,
} from './dto/admin-update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FindAllUsersDto } from '@modules/user/dto/find-all-users.dto';
import { FindDeletedUsersDto } from './dto/find-deleted-users.dto';

@ApiBearerAuth()
@ApiTags('admin')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('suspend-user')
  @ApiOperation({ summary: 'Suspend or ban a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  suspendUser(@Body() suspendDto: SuspendUserDto, @Request() req: any) {
    return this.adminService.suspendUser(suspendDto, req.user.id);
  }
  @Post('add-user')
  @ApiOperation({ summary: 'Add new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  addUser(@Body() addUserDto: CreateUserDto, @Request() req: any) {
    return this.adminService.addUser(addUserDto, req.user.id);
  }

  @Patch('update-user/:id')
  @ApiOperation({ summary: 'Update user details (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', description: 'User ID' })
  adminUpdateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Request() req: any,
  ) {
    return this.adminService.adminUpdateUser(id, dto, req.user.id);
  }

  @Patch('update-user-password/:id')
  @ApiOperation({ summary: 'Update user password (Admin only)' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', description: 'User ID' })
  adminUpdateUserPassword(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserPasswordDto,
    @Request() req: any,
  ) {
    return this.adminService.adminUpdateUserPassword(id, dto, req.user.id);
  }

  @Patch('user-status')
  updateUserStatus(
    @Request() req: any,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    const userId = req.user.id;
    return this.adminService.updateUserStatus(updateUserStatusDto, userId);
  }

  @Patch('find-all-users')
  findAllUsers(@Request() req, @Body() findAllUsersDto: FindAllUsersDto) {
    return this.adminService.findAllUsers(findAllUsersDto, req);
  }

  @Patch('find-all-deleted-users')
  findAllDeletedUsers(
    @Request() req: any,
    @Body() findDeletedUsersDto: FindDeletedUsersDto,
  ) {
    return this.adminService.findAllDeletedUsers(findDeletedUsersDto, req);
  }

  @Patch('restore-user/:id')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.adminService.restore(id, req.user);
  }
  @Delete('delete-user/:id')
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
  @Post('moderator-access')
  @ApiOperation({ summary: 'Grant or revoke moderator access (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Moderator access updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  manageModeratorAccess(
    @Body() accessDto: ModeratorAccessDto,
    @Request() req: any,
  ) {
    return this.adminService.manageModeratorAccess(accessDto, req.user.id);
  }

  @Get('suspension-history')
  @ApiOperation({ summary: 'Get all suspension history (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Suspension history retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSuspensionHistory(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getSuspensionHistory(req.user.id, page, limit);
  }

  @Get('flagged-users')
  @ApiOperation({
    summary: 'Get flagged users and payments (Admin/Manager only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Flagged users retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getFlaggedUsers(@Request() req: any) {
    return this.adminService.getFlaggedUsers(req.user.id);
  }

  @Post('review-appeal/:id')
  @ApiOperation({ summary: 'Review a suspension appeal (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Appeal reviewed successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiResponse({ status: 404, description: 'Suspension record not found' })
  @ApiParam({ name: 'id', description: 'Suspension ID' })
  @ApiQuery({ name: 'approved', required: true, type: Boolean })
  @ApiQuery({ name: 'reviewNotes', required: true, type: String })
  reviewAppeal(
    @Param('id') id: string,
    @Query('approved') approved: boolean,
    @Query('reviewNotes') reviewNotes: string,
    @Request() req: any,
  ) {
    return this.adminService.reviewAppeal(
      id,
      approved,
      reviewNotes,
      req.user.id,
    );
  }

  @Post('auto-upgrade-moderators')
  @ApiOperation({
    summary: 'Auto-upgrade eligible users to moderators (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users upgraded successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  autoUpgradeModerators() {
    return this.adminService.autoUpgradeModerators();
  }
}
