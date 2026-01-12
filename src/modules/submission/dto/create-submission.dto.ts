import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Screenshot file (required)',
  })
  @IsOptional()
  screenshot?: any;

  @ApiProperty({
    example: 'false',
    type: String,
    description: 'true or false',
  })
  @IsString()
  @IsNotEmpty()
  aiDetectionAnswer: string; // Changed to string

  @ApiProperty({
    example: 'The response feels overly formal and structured, typical of AI responses.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsNotEmpty()
  reasonText: string;
}