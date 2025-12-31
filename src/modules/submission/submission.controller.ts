import { Controller, Get, Post, Body, UseGuards, Request, Query, Param } from '@nestjs/common';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { BonusSubmissionDto } from './dto/bonus-submission.dto';
import { SubmissionAppealDto } from './dto/submission-appeal.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubmissionService } from './submission.service';

@ApiBearerAuth()
@ApiTags('submissions')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  create(@Body() createDto: CreateSubmissionDto, @Request() req: any) {
    return this.submissionService.create(createDto, req.user.id);
  }

  @Post(':id/bonus')
  submitBonus(@Body() bonusDto: BonusSubmissionDto, @Request() req: any) {
    return this.submissionService.submitBonus(bonusDto, req.user.id);
  }

  @Get('my-submissions')
  getMySubmissions(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.submissionService.findMySubmissions(req.user.id, page, limit);
  }

  @Get()
  getAll(@Request() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.submissionService.findAll(req.user.id, page, limit);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.submissionService.findOne(id, req.user.id);
  }

  @Post(':id/appeal')
  submitAppeal(@Body() appealDto: SubmissionAppealDto, @Request() req: any) {
    return this.submissionService.submitAppeal(appealDto, req.user.id);
  }
}