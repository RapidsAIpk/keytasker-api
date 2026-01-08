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

export class CampaignFilterDto {
  @ApiProperty({ example: 'Campaign Name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class FindAllCampaignsDto {
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

  @ApiProperty({ type: CampaignFilterDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignFilterDto)
  filters?: CampaignFilterDto;
}