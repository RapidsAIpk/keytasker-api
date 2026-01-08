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

export class UserFilterDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'Admin', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  accountStatus?: string;

  @ApiProperty({ example: 'United States', required: false })
  @IsOptional()
  @IsString()
  country?: string;
}
export class FindAllUsersDto {
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

  @ApiProperty({ type: UserFilterDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserFilterDto)
  filters?: UserFilterDto;
}
