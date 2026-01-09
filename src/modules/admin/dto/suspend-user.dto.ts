import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';

export class SuspendUserDto {
  @ApiProperty({
    description: 'User ID to suspend',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Suspension reason',
    example: 'Repeated violations of platform rules',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'New account status',
    enum: AccountStatus,
    example: AccountStatus.Suspended,
  })
  @IsEnum(AccountStatus)
  @IsNotEmpty()
  status: AccountStatus;

  @ApiProperty({
    description: 'Suspension end date (ISO format)',
    example: '2025-02-09T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  suspensionEndDate?: string;
}

export class ModeratorAccessDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Grant or revoke moderator access',
    example: true,
  })
  @IsNotEmpty()
  canModerate: boolean;

  @ApiProperty({
    description: 'Reason for access change',
    example: 'User has reached $25 earnings threshold',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
