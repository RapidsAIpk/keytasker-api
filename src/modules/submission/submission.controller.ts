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
  UseInterceptors,
} from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { BonusSubmissionDto } from './dto/bonus-submission.dto';
import { SubmissionAppealDto } from './dto/submission-appeal.dto';
import { FindAllSubmissionsDto } from './dto/find-all-submissions.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { SubmissionService } from './submission.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';

@ApiBearerAuth()
@ApiTags('submissions')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

@Post()
@ApiOperation({ summary: 'Create a new task submission' })
@ApiConsumes('multipart/form-data')
@UseInterceptors(FileInterceptor('screenshot'))
@ApiResponse({ status: 201, description: 'Submission created successfully' })
@ApiResponse({
  status: 400,
  description: 'Bad request - Task already submitted or campaign already interacted with',
})
@ApiResponse({ status: 403, description: 'Forbidden - Account suspended' })
@ApiResponse({ status: 404, description: 'Task not found' })
create(
  @Body() createDto: CreateSubmissionDto, 
  @UploadedFile() screenshot: Express.Multer.File,
  @Request() req: any
) {
  // console.log('=== SUBMISSION CONTROLLER START ===');
  // console.log('DTO received:', createDto);
  // console.log('Screenshot file:', screenshot ? {
  //   fieldname: screenshot.fieldname,
  //   originalname: screenshot.originalname,
  //   mimetype: screenshot.mimetype,
  //   size: screenshot.size
  // } : 'NO FILE');
  // console.log('User ID:', req.user?.id);
  // console.log('=== SUBMISSION CONTROLLER END ===');
  
  return this.submissionService.create(createDto, screenshot, req.user.id);
}
  @Post(':id/bonus')
  @ApiOperation({ summary: 'Submit bonus screenshot for continued conversation' })
  @ApiResponse({
    status: 201,
    description: 'Bonus submission added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Base submission not approved or bonus already submitted',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your submission' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiParam({ name: 'id', description: 'Submission ID' })
  submitBonus(
    @Param('id') id: string,
    @Body() bonusDto: BonusSubmissionDto,
    @Request() req: any,
  ) {
    return this.submissionService.submitBonus(
      { ...bonusDto, submissionId: id },
      req.user.id,
    );
  }

  @Patch('find-my-submissions')
  getMySubmissions(@Request() req: any, @Body() findAllDto: FindAllSubmissionsDto) {
    return this.submissionService.findMySubmissions(findAllDto, req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get submission statistics (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.submissionService.getStats(req.user.id);
  }

  @Patch('find-all-submissions')
  getAll(@Request() req: any, @Body() findAllDto: FindAllSubmissionsDto) {
    return this.submissionService.findAllSubmissions(findAllDto, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single submission by ID' })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only view own submissions (regular users)',
  })
  @ApiParam({ name: 'id', description: 'Submission ID' })
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.submissionService.findOne(id, req.user.id);
  }

  @Post(':id/appeal')
  @ApiOperation({ summary: 'Submit an appeal for a rejected submission' })
  @ApiResponse({ status: 201, description: 'Appeal submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Only rejected submissions can be appealed',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your submission' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiParam({ name: 'id', description: 'Submission ID' })
  submitAppeal(
    @Param('id') id: string,
    @Body() appealDto: SubmissionAppealDto,
    @Request() req: any,
  ) {
    return this.submissionService.submitAppeal(
      { ...appealDto, submissionId: id },
      req.user.id,
    );
  }
}