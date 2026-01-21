import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class TestNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    example: 'NewTasksAvailable',
    description: 'Notification type',
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    example: 'Test Notification',
    description: 'Notification title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'This is a test message',
    description: 'Notification message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}