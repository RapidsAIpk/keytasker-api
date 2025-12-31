import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
export class UpdateCampaignDto {
  @ApiProperty({
    description: 'Campaign ID to update',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Campaign name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Campaign description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Campaign status',
    enum: Status,
    required: false,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}

