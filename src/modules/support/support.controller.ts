import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { RespondTicketDto } from './dto/respond-ticket.dto';
import { FindTicketsDto, UpdateTicketStatusDto } from './dto/find-tickets.dto';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('support')
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  createTicket(@Body() createDto: CreateTicketDto, @Request() req: any) {
    return this.supportService.createTicket(createDto, req.user.id);
  }

  @Post('respond')
  @ApiOperation({ summary: 'Respond to a support ticket' })
  @ApiResponse({ status: 201, description: 'Response added successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only respond to own tickets or staff access required',
  })
  respondToTicket(@Body() respondDto: RespondTicketDto, @Request() req: any) {
    return this.supportService.respondToTicket(respondDto, req.user.id);
  }

  @Patch('find-all')
  @ApiOperation({
    summary: 'Get all tickets (Admin/Manager view all, Users view own)',
  })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  findAll(@Request() req: any, @Body() findTicketsDto: FindTicketsDto) {
    return this.supportService.findAll(findTicketsDto, req);
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get my support tickets' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyTickets(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getMyTickets(req.user.id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get support statistics (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.supportService.getStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket with all responses' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only view own tickets (regular users)',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.supportService.findOne(id, req.user.id);
  }

  @Post('update-status')
  @ApiOperation({ summary: 'Update ticket status (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  updateStatus(@Body() updateDto: UpdateTicketStatusDto, @Request() req: any) {
    return this.supportService.updateStatus(updateDto, req.user.id);
  }
}
