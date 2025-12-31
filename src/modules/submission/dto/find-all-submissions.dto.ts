import { ApiProperty } from '@nestjs/swagger';
import { SortEnum } from '@config/constants';
import { IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus } from '@prisma/client';

class SortDto {
  @ApiProperty({
    example: 'createdAt',
  })
  name: string;

  @ApiProperty({
    example: SortEnum.Desc,
    enum: SortEnum,
  })
  sort: SortEnum;
}

export class FindAllSubmissionsDto {
  @ApiProperty()
  @IsOptional()
  page: number;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => SortDto)
  sortDto: SortDto;

  @ApiProperty({
    enum: SubmissionStatus,
    required: false,
  })
  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;
}