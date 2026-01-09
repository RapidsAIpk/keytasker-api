import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Ticket subject',
    example: 'Unable to submit task',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Ticket message/description',
    example: 'I am getting an error when trying to submit my task...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Ticket category',
    example: 'Technical',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Ticket priority',
    enum: TicketPriority,
    default: TicketPriority.Medium,
    required: false,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;
}
