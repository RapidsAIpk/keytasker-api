import { SortDto } from '@modules/shared/dto/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus, TicketPriority } from '@prisma/client';
import {
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TicketFiltersDto {
  @ApiProperty({
    enum: TicketStatus,
    required: false,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiProperty({
    enum: TicketPriority,
    required: false,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiProperty({
    description: 'Filter by category',
    example: 'Technical',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}

export class FindTicketsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit: number;

  @ApiProperty({ type: SortDto })
  @ValidateNested()
  @Type(() => SortDto)
  sortDto: SortDto;

  @ApiProperty({ type: TicketFiltersDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TicketFiltersDto)
  filters?: TicketFiltersDto;
}

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({
    description: 'New ticket status',
    enum: TicketStatus,
    example: TicketStatus.Resolved,
  })
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  status: TicketStatus;

  @ApiProperty({
    description: 'Assign ticket to staff member ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsString()
  @IsOptional()
  assignedTo?: string;
}
