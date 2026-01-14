import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MyTicketFiltersDto {
  @ApiProperty({
    enum: TicketStatus,
    required: false,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;
}

export class FindMyTicketsDto {
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

  @ApiProperty({ type: MyTicketFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MyTicketFiltersDto)
  filters?: MyTicketFiltersDto;
}