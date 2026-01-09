import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Minimum withdrawal amount',
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumWithdrawal?: number;

  @ApiProperty({
    description: 'Base task payment amount',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseTaskPayment?: number;

  @ApiProperty({
    description: 'Bonus task payment amount',
    example: 4,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bonusTaskPayment?: number;

  @ApiProperty({
    description: 'Moderation fee per vote',
    example: 0.05,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  moderationFeePerVote?: number;

  @ApiProperty({
    description: 'Minimum earnings to become a moderator',
    example: 25,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  moderatorMinimumEarnings?: number;

  @ApiProperty({
    description: 'Suspension threshold (rejection rate)',
    example: 0.25,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  suspensionThreshold?: number;

  @ApiProperty({
    description: 'Minimum moderator accuracy required',
    example: 0.75,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  moderatorAccuracyMin?: number;

  @ApiProperty({
    description: 'Minimum votes required per submission',
    example: 3,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minVotesRequired?: number;

  @ApiProperty({
    description: 'Maximum votes required per submission',
    example: 5,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxVotesRequired?: number;

  @ApiProperty({
    description: 'Task reservation time in minutes',
    example: 60,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  taskReservationMinutes?: number;

  @ApiProperty({
    description: 'Moderation timeout in hours',
    example: 24,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  moderationTimeoutHours?: number;

  @ApiProperty({
    description: 'Allow task reservations',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  allowTaskReservations?: boolean;

  @ApiProperty({
    description: 'Allow user ideas',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  allowUserIdeas?: boolean;

  @ApiProperty({
    description: 'Maintenance mode',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;
}
