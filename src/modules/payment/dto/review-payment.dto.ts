import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class ReviewPaymentDto {
  @ApiProperty({
    description: 'Payment ID to review',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({
    description: 'Payment status decision',
    enum: PaymentStatus,
    example: PaymentStatus.Completed,
  })
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;

  @ApiProperty({
    description: 'Flag payment as suspicious',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  flagAsSuspicious?: boolean;

  @ApiProperty({
    description: 'Review notes',
    example: 'Payment approved after verification',
    required: false,
  })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
