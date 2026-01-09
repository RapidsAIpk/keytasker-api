import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentFiltersDto {
  @ApiProperty({
    enum: PaymentStatus,
    required: false,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({
    enum: PaymentMethod,
    required: false,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Show only flagged payments',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  flaggedOnly?: boolean;

  @ApiProperty({
    description: 'Minimum payment amount',
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @ApiProperty({
    description: 'Maximum payment amount',
    example: 1000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxAmount?: number;
}

export class FindPaymentsDto {
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

  @ApiProperty({ type: PaymentFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentFiltersDto)
  filters?: PaymentFiltersDto;
}
