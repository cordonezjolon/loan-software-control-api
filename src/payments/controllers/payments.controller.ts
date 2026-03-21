import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentMethod, PaymentStatus } from '../entities/loan-payment.entity';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a payment for an installment' })
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all payments with optional filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'installmentId', required: false })
  @ApiQuery({ name: 'loanId', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'paymentMethod', required: false, enum: PaymentMethod })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('installmentId') installmentId?: string,
    @Query('loanId') loanId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
  ) {
    return this.paymentsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      installmentId,
      loanId,
      clientId,
      status,
      paymentMethod,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Delete(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending payment' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.cancel(id, reason);
  }
}
