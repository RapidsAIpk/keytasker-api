import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { VoteSubmissionDto } from './dto/vote-submission.dto';
import { FindPendingSubmissionsDto } from './dto/find-pending-submissions.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('moderation')
@UseGuards(JwtAuthGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Patch('pending-submissions')
  @ApiOperation({ summary: 'Get submissions pending moderation (Moderators only)' })
  @ApiResponse({
    status: 200,
    description: 'Pending submissions retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Must have moderator access',
  })
  findPendingSubmissions(
    @Request() req: any,
    @Body() findPendingDto: FindPendingSubmissionsDto,
  ) {
    return this.moderationService.findPendingSubmissions(findPendingDto, req);
  }

  @Post('vote')
  @ApiOperation({ summary: 'Vote on a submission (Moderators only)' })
  @ApiResponse({ status: 201, description: 'Vote submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Already voted or invalid submission',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Must have moderator access',
  })
  voteOnSubmission(@Body() voteDto: VoteSubmissionDto, @Request() req: any) {
    return this.moderationService.voteOnSubmission(voteDto, req.user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get moderation statistics (Admin/Manager only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.moderationService.getStats(req.user.id);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get my moderation history (Moderators only)' })
  @ApiResponse({
    status: 200,
    description: 'Moderation history retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Must have moderator access',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyHistory(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.moderationService.getMyModerationHistory(
      req.user.id,
      page,
      limit,
    );
  }
}
