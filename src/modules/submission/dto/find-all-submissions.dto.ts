import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmissionFilterDto {
  @ApiProperty({ example: 'Pending', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'user-id-123', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'task-id-123', required: false })
  @IsOptional()
  @IsString()
  taskId?: string;
}

export class FindAllSubmissionsDto {
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

  @ApiProperty({ type: SubmissionFilterDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubmissionFilterDto)
  filters?: SubmissionFilterDto;
}