import { ApiProperty } from '@nestjs/swagger';
import { TaskType, TaskStatus } from '@prisma/client';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class UpdateTaskDto {
  @ApiProperty({
    description: 'Task ID to update',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Type of messaging platform',
    enum: TaskType,
    required: false,
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiProperty({
    description: 'Recipient to send message to',
    required: false,
  })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiProperty({
    description: 'Broad topic instruction for users',
    required: false,
  })
  @IsString()
  @IsOptional()
  topicInstruction?: string;

  @ApiProperty({
    description: 'Detailed instructions for the task',
    required: false,
  })
  @IsString()
  @IsOptional()
  detailedInstructions?: string;

  @ApiProperty({
    description: 'Base payment for completing the task',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePayment?: number;

  @ApiProperty({
    description: 'Bonus payment for continuing conversation',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bonusPayment?: number;

  @ApiProperty({
    description: 'Total quantity/number of times task can be completed',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalQuantity?: number;

  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}