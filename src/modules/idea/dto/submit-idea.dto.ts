import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitIdeaDto {
  @ApiProperty({
    description: 'Idea title',
    example: 'Add video call task category',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Idea description',
    example: 'It would be great to have tasks where users test video call quality...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Idea category',
    example: 'Feature Request',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}
