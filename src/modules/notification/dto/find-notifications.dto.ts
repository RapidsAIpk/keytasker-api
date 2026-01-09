import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationFiltersDto {
  @ApiProperty({
    enum: NotificationType,
    required: false,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({
    description: 'Filter by read status',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

export class FindNotificationsDto {
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

  @ApiProperty({ type: NotificationFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationFiltersDto)
  filters?: NotificationFiltersDto;
}
