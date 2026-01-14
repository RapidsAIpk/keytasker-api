import {
  Controller,
  Get,
  UseGuards,
  Request,
  Patch,
  Body,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { FindActivityLogsDto } from './dto/find-activity-logs.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('analytics')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getDashboard(@Request() req: any) {
    return this.analyticsService.getDashboardOverview(req.user.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user analytics (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'User analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getUserAnalytics(@Request() req: any) {
    return this.analyticsService.getUserAnalytics(req.user.id);
  }

  @Get('tasks')
  @ApiOperation({
    summary: 'Get task performance analytics (Admin/Manager only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Task analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getTaskPerformance(@Request() req: any) {
    return this.analyticsService.getTaskPerformance(req.user.id);
  }

  @Patch('activity-logs')
  @ApiOperation({ summary: 'Get activity logs (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getActivityLogs(
    @Request() req: any,
    @Body() findLogsDto: FindActivityLogsDto,
  ) {
    return this.analyticsService.getActivityLogs(findLogsDto, req.user.id);
  }
}