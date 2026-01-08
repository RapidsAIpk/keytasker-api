import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { FindAllCampaignsDto } from './dto/find-all-campaigns.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('campaigns')
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign (Admin only)' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  create(@Body() createCampaignDto: CreateCampaignDto, @Request() req: any) {
    return this.campaignService.create(createCampaignDto, req.user.id);
  }

@Patch('find-all-campaigns')
  findAll(@Request() req: any, @Body() findAllDto: FindAllCampaignsDto) {
    return this.campaignService.findAll(findAllDto, req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get campaign statistics (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.campaignService.getStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by ID (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Campaign retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.campaignService.findOne(id, req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a campaign (Admin only)' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  update(@Body() updateCampaignDto: UpdateCampaignDto, @Request() req: any) {
    return this.campaignService.update(updateCampaignDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign (Admin only, soft delete)' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID to delete' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.campaignService.remove(id, req.user.id);
  }
}