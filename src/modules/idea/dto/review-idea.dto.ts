import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IdeaStatus } from '@prisma/client';

export class ReviewIdeaDto {
  @ApiProperty({
    description: 'Idea ID to review',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  ideaId: string;

  @ApiProperty({
    description: 'Review decision',
    enum: IdeaStatus,
    example: IdeaStatus.Approved,
  })
  @IsEnum(IdeaStatus)
  @IsNotEmpty()
  status: IdeaStatus;

  @ApiProperty({
    description: 'Review notes/feedback',
    example: 'Great idea! We will implement this in Q2.',
    required: false,
  })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
