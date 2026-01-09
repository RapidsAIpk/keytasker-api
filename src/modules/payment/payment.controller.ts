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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from './payment.service';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { FindPaymentsDto } from './dto/find-payments.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
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
@ApiTags('payments')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request a payment/withdrawal' })
  @ApiResponse({ status: 201, description: 'Payment request submitted' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Insufficient balance or minimum not met',
  })
  requestPayment(@Body() requestDto: RequestPaymentDto, @Request() req: any) {
    return this.paymentService.requestPayment(requestDto, req.user.id);
  }

  @Patch('find-all')
  @ApiOperation({
    summary: 'Get all payments (Admin/Manager view all, Users view own)',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  findAll(@Request() req: any, @Body() findPaymentsDto: FindPaymentsDto) {
    return this.paymentService.findAll(findPaymentsDto, req);
  }

  @Get('my-payments')
  @ApiOperation({ summary: 'Get my payment requests' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyPayments(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentService.getMyPayments(req.user.id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics (Admin/Manager only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  getStats(@Request() req: any) {
    return this.paymentService.getStats(req.user.id);
  }

  @Get('export-csv')
  @ApiOperation({ summary: 'Export payments to CSV (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'CSV generated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'flaggedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async exportCSV(
    @Request() req: any,
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('flaggedOnly') flaggedOnly?: boolean,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = { status, flaggedOnly, startDate, endDate };
    const result = await this.paymentService.exportToCSV(req.user.id, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return res.send(result.csvContent);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only view own payments (regular users)',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.paymentService.findOne(id, req.user.id);
  }

  @Post('review')
  @ApiOperation({ summary: 'Review a payment (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Payment reviewed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Only pending payments can be reviewed',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  reviewPayment(@Body() reviewDto: ReviewPaymentDto, @Request() req: any) {
    return this.paymentService.reviewPayment(reviewDto, req.user.id);
  }
}
