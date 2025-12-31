import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BonusSubmissionDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/bonus.jpg',
  })
  @IsString()
  @IsNotEmpty()
  bonusScreenshotUrl: string;
}