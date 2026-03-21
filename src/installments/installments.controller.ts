import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Post,
  Body,
  Patch,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { InstallmentsService } from './installments.service';
import { LoanInstallment } from './entities/loan-installment.entity';
import { FindInstallmentsDto } from './dto/find-installments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';

@ApiTags('Installments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all installments with filtering and pagination',
    description: 'Retrieves installments with comprehensive filtering options including overdue status'
  })
  @ApiQuery({ type: FindInstallmentsDto })
  @ApiResponse({
    status: 200,
    description: 'Installments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/LoanInstallment' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 15 },
      },
    },
  })
  async findAll(@Query() query: FindInstallmentsDto): Promise<PaginatedResult<LoanInstallment>> {
    return this.installmentsService.findAll(query);
  }

  @Get('overdue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Get all overdue installments',
    description: 'Retrieves all installments that are past their due date and unpaid'
  })
  @ApiResponse({
    status: 200,
    description: 'Overdue installments retrieved successfully',
    type: [LoanInstallment],
  })
  async findOverdueInstallments(): Promise<LoanInstallment[]> {
    return this.installmentsService.findOverdueInstallments();
  }

  @Get('upcoming/:days')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Get upcoming installments',
    description: 'Retrieves installments due within the specified number of days'
  })
  @ApiParam({ 
    name: 'days', 
    description: 'Number of days ahead to look for upcoming installments',
    example: 7
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming installments retrieved successfully',
    type: [LoanInstallment],
  })
  async findUpcomingInstallments(@Param('days') days: number): Promise<LoanInstallment[]> {
    return this.installmentsService.findUpcomingInstallments(days);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Get installment statistics',
    description: 'Provides comprehensive installment statistics including overdue amounts and payment trends'
  })
  @ApiQuery({ 
    name: 'loanId', 
    required: false, 
    description: 'Get statistics for a specific loan' 
  })
  @ApiResponse({
    status: 200,
    description: 'Installment statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalInstallments: { type: 'number', example: 360 },
        paidInstallments: { type: 'number', example: 48 },
        overdueInstallments: { type: 'number', example: 3 },
        pendingAmount: { type: 'number', example: 285750.00 },
        overdueAmount: { type: 'number', example: 4025.00 },
        totalLateFees: { type: 'number', example: 125.00 },
        nextDueDate: { type: 'string', format: 'date', example: '2024-02-15' },
        averageDaysOverdue: { type: 'number', example: 7 }
      }
    }
  })
  async getStatistics(@Query('loanId') loanId?: string) {
    return this.installmentsService.getInstallmentStatistics(loanId);
  }

  @Get('loan/:loanId')
  @ApiOperation({ 
    summary: 'Get installments for a specific loan',
    description: 'Retrieves all installments for a specific loan ordered by installment number'
  })
  @ApiParam({ name: 'loanId', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan installments retrieved successfully',
    type: [LoanInstallment],
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async findByLoanId(@Param('loanId', ParseUUIDPipe) loanId: string): Promise<LoanInstallment[]> {
    return this.installmentsService.findByLoanId(loanId);
  }

  @Get('loan/:loanId/balance')
  @ApiOperation({ 
    summary: 'Get remaining balance for a loan',
    description: 'Calculates the total remaining balance from unpaid installments including late fees'
  })
  @ApiParam({ name: 'loanId', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Remaining balance calculated successfully',
    schema: {
      type: 'object',
      properties: {
        remainingBalance: {
          type: 'number',
          format: 'decimal',
          example: 289775.00,
          description: 'Total remaining balance including late fees'
        },
        principalBalance: {
          type: 'number',
          format: 'decimal',
          example: 285750.00,
          description: 'Principal amount remaining'
        },
        lateFeesBalance: {
          type: 'number',
          format: 'decimal',
          example: 4025.00,
          description: 'Total late fees outstanding'
        }
      }
    }
  })
  async getRemainingBalance(@Param('loanId', ParseUUIDPipe) loanId: string) {
    const totalBalance = await this.installmentsService.calculateRemainingBalance(loanId);
    const installments = await this.installmentsService.findByLoanId(loanId);
    
    const lateFeesBalance = installments
      .filter(i => i.status !== 'paid')
      .reduce((total, installment) => total + Number(installment.lateFee), 0);
    
    const principalBalance = totalBalance - lateFeesBalance;
    
    return {
      remainingBalance: totalBalance,
      principalBalance,
      lateFeesBalance,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get installment by ID',
    description: 'Retrieves detailed installment information including payment history'
  })
  @ApiParam({ name: 'id', description: 'Installment ID' })
  @ApiResponse({
    status: 200,
    description: 'Installment found successfully',
    type: LoanInstallment,
  })
  @ApiResponse({
    status: 404,
    description: 'Installment not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LoanInstallment> {
    return this.installmentsService.findOne(id);
  }

  @Get(':id/payment-history')
  @ApiOperation({ 
    summary: 'Get payment history for an installment',
    description: 'Retrieves all payments made towards a specific installment'
  })
  @ApiParam({ name: 'id', description: 'Installment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          amount: { type: 'number', format: 'decimal', example: 1342.05 },
          paymentDate: { type: 'string', format: 'date-time', example: '2024-01-15T00:00:00Z' },
          paymentMethod: { type: 'string', example: 'BANK_TRANSFER' },
          status: { type: 'string', example: 'COMPLETED' },
          reference: { type: 'string', example: 'TXN123456789' }
        }
      }
    }
  })
  async getPaymentHistory(@Param('id', ParseUUIDPipe) id: string): Promise<any[]> {
    return this.installmentsService.getPaymentHistory(id);
  }

  @Post(':id/apply-late-fee')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Apply late fee to overdue installment',
    description: 'Manually applies a late fee to an overdue installment'
  })
  @ApiParam({ name: 'id', description: 'Installment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          format: 'decimal',
          description: 'Late fee amount to apply',
          example: 25.00,
          minimum: 0.01,
        },
        reason: {
          type: 'string',
          description: 'Reason for applying the late fee',
          example: 'Payment overdue by 15 days',
          maxLength: 255,
        },
      },
      required: ['amount'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Late fee applied successfully',
    type: LoanInstallment,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot apply late fee (invalid status or amount)',
  })
  @ApiResponse({
    status: 404,
    description: 'Installment not found',
  })
  async applyLateFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: number,
    @Body('reason') reason?: string,
  ): Promise<LoanInstallment> {
    return this.installmentsService.applyLateFees(id, amount);
  }

  @Patch('loan/:loanId/reschedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Reschedule loan installments',
    description: 'Updates the payment schedule for a loan (for loan modifications)'
  })
  @ApiParam({ name: 'loanId', description: 'Loan ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newSchedule: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              installmentNumber: { type: 'integer', example: 1 },
              totalAmount: { type: 'number', format: 'decimal', example: 1342.05 },
              dueDate: { type: 'string', format: 'date', example: '2024-02-15' },
            },
            required: ['installmentNumber', 'totalAmount', 'dueDate'],
          },
        },
      },
      required: ['newSchedule'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Installments rescheduled successfully',
    type: [LoanInstallment],
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot reschedule completed or closed loan',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async rescheduleInstallments(
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body('newSchedule') newSchedule: Array<{
      installmentNumber: number;
      totalAmount: number;
      dueDate: string;
    }>,
  ): Promise<LoanInstallment[]> {
    const schedule = newSchedule.map(item => ({
      ...item,
      dueDate: new Date(item.dueDate),
    }));

    return this.installmentsService.rescheduleInstallments(loanId, schedule);
  }
}