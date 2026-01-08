// apps/keytasker/src/modules/user/dto/find-deleted-users.dto.ts
import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { UserFilterDto } from './find-all-users.dto';


export class FindDeletedUsersDto {
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