import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public platform settings' })
  @ApiResponse({
    status: 200,
    description: 'Public settings retrieved successfully',
  })
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all platform settings (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getSettings(@Request() req: any) {
    return this.settingsService.getSettings(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('update')
  @ApiOperation({ summary: 'Update platform settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  updateSettings(@Body() updateDto: UpdateSettingsDto, @Request() req: any) {
    return this.settingsService.updateSettings(updateDto, req.user.id);
  }
}
