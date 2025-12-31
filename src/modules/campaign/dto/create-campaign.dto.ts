import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Q1 2025 Email Testing Campaign',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Campaign description',
    example: 'Testing email responses from various companies for AI detection',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Campaign status',
    enum: Status,
    default: Status.Active,
    required: false,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}