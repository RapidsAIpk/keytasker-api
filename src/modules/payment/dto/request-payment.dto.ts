import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPaymentDto {
  @ApiProperty({
    description: 'Amount to withdraw',
    example: 50.0,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Optional payment notes',
    example: 'PayPal: user@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
