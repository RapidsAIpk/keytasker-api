import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteDecision } from '@prisma/client';

export class VoteSubmissionDto {
  @ApiProperty({
    description: 'Submission ID to vote on',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({
    description: 'Vote decision',
    enum: VoteDecision,
    example: VoteDecision.Approve,
  })
  @IsEnum(VoteDecision)
  @IsNotEmpty()
  decision: VoteDecision;

  @ApiProperty({
    description: 'Optional comment explaining the decision',
    example: 'Screenshot shows clear conversation flow and matches requirements',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
