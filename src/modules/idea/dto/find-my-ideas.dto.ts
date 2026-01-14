import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IdeaStatus } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MyIdeaFiltersDto {
  @ApiProperty({
    enum: IdeaStatus,
    required: false,
  })
  @IsEnum(IdeaStatus)
  @IsOptional()
  status?: IdeaStatus;
}

export class FindMyIdeasDto {
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

  @ApiProperty({ type: MyIdeaFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MyIdeaFiltersDto)
  filters?: MyIdeaFiltersDto;
}