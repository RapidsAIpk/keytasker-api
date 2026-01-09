import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { TaskType, SubmissionStatus } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ModerationFiltersDto {
  @ApiProperty({
    enum: TaskType,
    required: false,
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiProperty({
    enum: SubmissionStatus,
    required: false,
  })
  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;

  @ApiProperty({
    description: 'Show only bonus submissions',
    example: false,
    required: false,
  })
  @IsOptional()
  bonusOnly?: boolean;
}

export class FindPendingSubmissionsDto {
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

  @ApiProperty({ type: ModerationFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModerationFiltersDto)
  filters?: ModerationFiltersDto;
}
