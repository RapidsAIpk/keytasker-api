import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
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
  @ApiOperation({ summary: 'Get flagged users and payments (Admin/Manager only)' })
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
    return this.adminService.reviewAppeal(id, approved, reviewNotes, req.user.id);
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
