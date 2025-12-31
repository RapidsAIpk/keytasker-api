import { ApiProperty } from '@nestjs/swagger';
import { TaskType, TaskStatus } from '@prisma/client';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Type of messaging platform',
    enum: TaskType,
    example: TaskType.Email,
  })
  @IsEnum(TaskType)
  @IsNotEmpty()
  taskType: TaskType;

  @ApiProperty({
    description: 'Recipient to send message to (e.g., email address, username, etc.)',
    example: 'support@example.com',
  })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiProperty({
    description: 'Broad topic instruction for users (they create their own text)',
    example: 'Ask this company if they also sell laptops',
  })
  @IsString()
  @IsNotEmpty()
  topicInstruction: string;

  @ApiProperty({
    description: 'Detailed instructions for the task (optional)',
    example: 'Be polite and professional. Mention you are interested in bulk purchasing.',
    required: false,
  })
  @IsString()
  @IsOptional()
  detailedInstructions?: string;

  @ApiProperty({
    description: 'Base payment for completing the task ($1 default)',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePayment?: number;

  @ApiProperty({
    description: 'Bonus payment for continuing conversation ($4 default)',
    example: 4,
    default: 4,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bonusPayment?: number;

  @ApiProperty({
    description: 'Total quantity/number of times task can be completed by different users',
    example: 50,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  totalQuantity: number;

  @ApiProperty({
    description: 'Campaign ID to group related tasks (hidden from users)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    default: TaskStatus.Active,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}