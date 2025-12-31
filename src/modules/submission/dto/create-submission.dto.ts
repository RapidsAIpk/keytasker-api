import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  })
  @IsString()
  @IsNotEmpty()
  screenshotUrl: string;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  aiDetectionAnswer: boolean;

  @ApiProperty({
    example: 'The response feels overly formal and structured, typical of AI responses.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsNotEmpty()
  reasonText: string;
}