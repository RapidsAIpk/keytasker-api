import { ApiProperty } from '@nestjs/swagger';
import { TaskType, TaskStatus } from '@prisma/client';
import { IsOptional, IsEnum, IsNumber, Min, IsString } from 'class-validator';

export class TaskFilterDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: 'Filter by task type',
    enum: TaskType,
    required: false,
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiProperty({
    description: 'Filter by task status',
    enum: TaskStatus,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filter by campaign ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiProperty({
    description: 'Search in recipient or topic instruction',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Show only tasks with low completion rate (for manager)',
    required: false,
  })
  @IsOptional()
  lowCompletionRate?: boolean;

  @ApiProperty({
    description: 'Show only tasks with high rejection rate (for manager)',
    required: false,
  })
  @IsOptional()
  highRejectionRate?: boolean;
}