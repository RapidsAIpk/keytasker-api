import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IdeaStatus } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IdeaFiltersDto {
  @ApiProperty({
    enum: IdeaStatus,
    required: false,
  })
  @IsEnum(IdeaStatus)
  @IsOptional()
  status?: IdeaStatus;

  @ApiProperty({
    description: 'Filter by category',
    example: 'Feature Request',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}

export class FindIdeasDto {
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

  @ApiProperty({ type: IdeaFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdeaFiltersDto)
  filters?: IdeaFiltersDto;
}
