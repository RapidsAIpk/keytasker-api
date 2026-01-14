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

export class ActivityLogFiltersDto {
  @ApiProperty({ example: 'PaymentReviewed', required: false })
  @IsOptional()
  @IsString()
  activityType?: string;

  @ApiProperty({ example: 'userId123', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class FindActivityLogsDto {
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

  @ApiProperty({ type: ActivityLogFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActivityLogFiltersDto)
  filters?: ActivityLogFiltersDto;
}