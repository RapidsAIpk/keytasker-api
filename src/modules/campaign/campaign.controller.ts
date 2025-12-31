import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CampaignService } from './campaign.service';

import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiBearerAuth()
@ApiTags('campaigns')
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign (Admin only)' })
  create(@Body() createCampaignDto: CreateCampaignDto, @Request() req: any) {
    return this.campaignService.create(createCampaignDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns (Admin/Manager only)' })
  findAll(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.campaignService.findAll(req.user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by ID (Admin/Manager only)' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.campaignService.findOne(id, req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a campaign (Admin only)' })
  update(@Body() updateCampaignDto: UpdateCampaignDto, @Request() req: any) {
    return this.campaignService.update(updateCampaignDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign (Admin only)' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.campaignService.remove(id, req.user.id);
  }
}