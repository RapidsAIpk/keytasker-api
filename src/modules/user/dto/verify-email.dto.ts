import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class VerifyEmailDto {
  @ApiProperty()
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase()) // Auto-transform to lowercase
  email: string;

   @ApiProperty({ description: '6‑digit code', type: Number })
  @Type(() => Number)      // <-- class-transformer will turn the incoming value into a number
  @IsInt()                 // <-- must be an integer
  @Min(100_000)            // <-- at least 100000
  @Max(999_999)            // <-- at most 999999
  emailVerificationCode: number;
}
