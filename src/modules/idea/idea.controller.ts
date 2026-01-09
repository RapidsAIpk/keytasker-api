import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { IdeaService } from './idea.service';
import { SubmitIdeaDto } from './dto/submit-idea.dto';
import { ReviewIdeaDto } from './dto/review-idea.dto';
import { FindIdeasDto } from './dto/find-ideas.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('ideas')
@UseGuards(JwtAuthGuard)
@Controller('ideas')
export class IdeaController {
  constructor(private readonly ideaService: IdeaService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit a new idea' })
  @ApiResponse({ status: 201, description: 'Idea submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Idea submissions may be disabled',
  })
  submitIdea(@Body() submitDto: SubmitIdeaDto, @Request() req: any) {
    return this.ideaService.submitIdea(submitDto, req.user.id);
  }

  @Post('review')
  @ApiOperation({ summary: 'Review an idea (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Idea reviewed successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiResponse({ status: 404, description: 'Idea not found' })
  reviewIdea(@Body() reviewDto: ReviewIdeaDto, @Request() req: any) {
    return this.ideaService.reviewIdea(reviewDto, req.user.id);
  }

  @Patch('find-all')
  @ApiOperation({
    summary: 'Get all ideas (Admin/Manager view all, Users view own)',
  })
  @ApiResponse({ status: 200, description: 'Ideas retrieved successfully' })
  findAll(@Request() req: any, @Body() findIdeasDto: FindIdeasDto) {
    return this.ideaService.findAll(findIdeasDto, req);
  }

  @Get('my-ideas')
  @ApiOperation({ summary: 'Get my submitted ideas' })
  @ApiResponse({ status: 200, description: 'Ideas retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyIdeas(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ideaService.getMyIdeas(req.user.id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get idea statistics (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.ideaService.getStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single idea' })
  @ApiResponse({ status: 200, description: 'Idea retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Idea not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only view own ideas (regular users)',
  })
  @ApiParam({ name: 'id', description: 'Idea ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.ideaService.findOne(id, req.user.id);
  }
}
