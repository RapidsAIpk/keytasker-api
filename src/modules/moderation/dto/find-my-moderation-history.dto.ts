import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { VoteDecision, VoteType, SubmissionStatus } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ModerationHistoryFilterDto {
  @ApiProperty({
    enum: VoteDecision,
    required: false,
    description: 'Filter by vote decision (Approve/Reject)',
  })
  @IsEnum(VoteDecision)
  @IsOptional()
  decision?: VoteDecision;

  @ApiProperty({
    enum: VoteType,
    required: false,
    description: 'Filter by vote type (Base/Bonus)',
  })
  @IsEnum(VoteType)
  @IsOptional()
  voteType?: VoteType;

  @ApiProperty({
    enum: SubmissionStatus,
    required: false,
    description: 'Filter by submission status',
  })
  @IsEnum(SubmissionStatus)
  @IsOptional()
  submissionStatus?: SubmissionStatus;

  @ApiProperty({
    type: Boolean,
    required: false,
    description: 'Filter by whether vote was correct',
  })
  @IsOptional()
  wasCorrect?: boolean;
}

export class FindMyModerationHistoryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit: number;

  @ApiProperty({ type: SortDto })
  @ValidateNested()
  @Type(() => SortDto)
  sortDto: SortDto;

  @ApiProperty({ type: ModerationHistoryFilterDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModerationHistoryFilterDto)
  filters?: ModerationHistoryFilterDto;
}