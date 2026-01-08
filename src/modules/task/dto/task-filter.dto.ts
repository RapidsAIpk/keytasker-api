import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { TaskType, TaskStatus } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';

export class TaskFilterDto {
  @ApiProperty()
  page: number;

  @ApiProperty({
    type: SortDto,
  })
  sortDto: SortDto;

  @ApiProperty({
    enum: TaskType,
    required: false,
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiProperty({
    enum: TaskStatus,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}