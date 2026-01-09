import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondTicketDto {
  @ApiProperty({
    description: 'Ticket ID to respond to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Thank you for contacting us. We are looking into this issue...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Is this a staff response (Admin/Manager)',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isStaffResponse?: boolean;
}
