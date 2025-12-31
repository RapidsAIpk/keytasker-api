import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class SubmissionAppealDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({
    example: 'I believe this was incorrectly rejected because the conversation clearly stayed on topic and the response quality was appropriate.',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  @IsNotEmpty()
  appealReason: string;
}