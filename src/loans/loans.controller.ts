import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';
import {
  LoanCalculationDto,
  LoanCalculationResultDto,
  EarlyPayoffCalculationDto,
  EarlyPayoffResultDto,
} from './dto/loan-calculation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';
import { InstallmentStatus } from '../installments/entities/loan-installment.entity';
import { ProcessEarlySettlementDto, EarlySettlementPreviewDto } from './dto/early-settlement.dto';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({
    summary: 'Create new loan application',
    description:
      'Creates a new loan application with calculated payment details and amortization schedule',
  })
  @ApiBody({ type: CreateLoanDto })
  @ApiResponse({
    status: 201,
    description: 'Loan application created successfully',
    type: Loan,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid loan data or client not eligible',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  async create(
    @Body() createLoanDto: CreateLoanDto,
    @GetUser() currentUser: { id: string; role: UserRole },
  ): Promise<Loan> {
    // If no loan officer specified, assign the current user (if they're a loan officer)
    if (!createLoanDto.loanOfficerId && currentUser.role === UserRole.LOAN_OFFICER) {
      createLoanDto.loanOfficerId = currentUser.id;
    }

    return this.loansService.create(createLoanDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all loans with filtering and pagination',
    description: 'Retrieves loans with comprehensive filtering options and pagination support',
  })
  @ApiQuery({ type: FindLoansDto })
  @ApiResponse({
    status: 200,
    description: 'Loans retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Loan' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 15 },
      },
    },
  })
  async findAll(@Query() query: FindLoansDto): Promise<PaginatedResult<Loan>> {
    return this.loansService.findAll(query);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({
    summary: 'Get loan statistics and analytics',
    description:
      'Provides comprehensive loan statistics including totals, averages, and distribution by status and type',
  })
  @ApiQuery({
    name: 'loanOfficerId',
    required: false,
    description: 'Filter statistics by specific loan officer',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalLoans: { type: 'number', example: 150 },
        totalPrincipal: { type: 'number', example: 15000000 },
        averageLoanAmount: { type: 'number', example: 100000 },
        loansByStatus: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        loansByType: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        averageInterestRate: { type: 'number', example: 0.055 },
        approvalRate: { type: 'number', example: 85.5 },
      },
    },
  })
  async getStatistics(@Query('loanOfficerId') loanOfficerId?: string): Promise<unknown> {
    return this.loansService.getLoanStatistics(loanOfficerId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get loan by ID',
    description:
      'Retrieves detailed loan information including client data and installment schedule',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan found successfully',
    type: Loan,
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Loan> {
    return this.loansService.findOne(id);
  }

  // eslint-disable-next-line max-lines-per-function
  @Get(':id/balance')
  @ApiOperation({
    summary: 'Get current loan balance',
    description: 'Retrieves the current outstanding balance for an active loan',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Current balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        currentBalance: {
          type: 'number',
          format: 'decimal',
          example: 185750.5,
          description: 'Current outstanding loan balance',
        },
        lastPaymentDate: {
          type: 'string',
          format: 'date',
          example: '2024-01-15',
          description: 'Date of last payment made',
        },
        nextPaymentDate: {
          type: 'string',
          format: 'date',
          example: '2024-02-15',
          description: 'Date of next payment due',
        },
        remainingPayments: {
          type: 'integer',
          example: 342,
          description: 'Number of payments remaining',
        },
      },
    },
  })
  async getCurrentBalance(@Param('id', ParseUUIDPipe) id: string): Promise<{
    currentBalance: number;
    lastPaymentDate?: string;
    nextPaymentDate?: string;
    remainingPayments: number;
  }> {
    const loan = await this.loansService.findOne(id);
    const currentBalance = await this.loansService.getCurrentLoanBalance(id);
    const remainingPayments =
      loan.installments?.filter(i => i.status !== InstallmentStatus.PAID).length || 0;

    return {
      currentBalance,
      remainingPayments,
      // Additional payment date logic would be implemented here
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({
    summary: 'Update loan details',
    description: 'Updates loan information (limited fields based on loan status)',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiBody({ type: UpdateLoanDto })
  @ApiResponse({
    status: 200,
    description: 'Loan updated successfully',
    type: Loan,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update data or loan cannot be modified',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLoanDto: UpdateLoanDto,
  ): Promise<Loan> {
    return this.loansService.update(id, updateLoanDto);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve loan application',
    description: 'Approves a pending loan application',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan approved successfully',
    type: Loan,
  })
  @ApiResponse({
    status: 400,
    description: 'Loan cannot be approved (invalid status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async approveLoan(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole },
  ): Promise<Loan> {
    return this.loansService.approveLoan(id, currentUser.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject loan application',
    description: 'Rejects a pending loan application with a reason',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Reason for loan rejection',
          example: 'Insufficient income verification documents',
          maxLength: 500,
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Loan rejected successfully',
    type: Loan,
  })
  @ApiResponse({
    status: 400,
    description: 'Loan cannot be rejected (invalid status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async rejectLoan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<Loan> {
    return this.loansService.rejectLoan(id, reason);
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate approved loan',
    description: 'Activates an approved loan to begin payment schedule',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan activated successfully',
    type: Loan,
  })
  @ApiResponse({
    status: 400,
    description: 'Loan cannot be activated (not approved)',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async activateLoan(@Param('id', ParseUUIDPipe) id: string): Promise<Loan> {
    return this.loansService.activateLoan(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel/delete loan',
    description: 'Cancels a loan application (only for non-active loans)',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({
    status: 204,
    description: 'Loan cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete active loan',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.loansService.remove(id);
  }

  @Get(':id/early-settlement/preview')
  @ApiOperation({
    summary: 'Preview early settlement terms',
    description:
      'Returns the settlement amount and rebate breakdown without committing any payment',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiResponse({ status: 200, description: 'Settlement preview generated' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async previewSettlement(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EarlySettlementPreviewDto> {
    return this.loansService.previewEarlySettlement(id);
  }

  @Post(':id/early-settlement/settle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute early settlement',
    description:
      'Records the settlement payment, marks remaining installments paid, and closes the loan',
  })
  @ApiParam({ name: 'id', description: 'Loan ID' })
  @ApiBody({ type: ProcessEarlySettlementDto })
  @ApiResponse({ status: 200, description: 'Loan settled successfully' })
  @ApiResponse({ status: 400, description: 'Loan is not active or not eligible for settlement' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async settleEarly(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessEarlySettlementDto,
  ): Promise<EarlySettlementPreviewDto> {
    return this.loansService.settleEarly(id, dto);
  }
}

@ApiTags('Loan Calculations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loan-calculations')
export class LoanCalculationsController {
  constructor(private readonly loansService: LoansService) {}

  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate loan payment details',
    description:
      'Performs loan calculations including monthly payments, amortization schedule, and total costs',
  })
  @ApiBody({ type: LoanCalculationDto })
  @ApiResponse({
    status: 200,
    description: 'Loan calculation completed successfully',
    type: LoanCalculationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid calculation parameters',
  })
  calculateLoan(@Body() calculationDto: LoanCalculationDto): LoanCalculationResultDto {
    return this.loansService.calculateLoanMetrics(calculationDto);
  }

  @Post('early-payoff')
  @ApiOperation({
    summary: 'Calculate early payoff scenarios',
    description: 'Calculates potential savings from extra payments or lump sum payoffs',
  })
  @ApiBody({ type: EarlyPayoffCalculationDto })
  @ApiResponse({
    status: 200,
    description: 'Early payoff calculation completed successfully',
    type: EarlyPayoffResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid loan ID or calculation parameters',
  })
  async calculateEarlyPayoff(
    @Body() calculationDto: EarlyPayoffCalculationDto,
  ): Promise<EarlyPayoffResultDto> {
    return this.loansService.calculateEarlyPayoff(calculationDto);
  }

  @Get('payment-schedule-preview')
  @ApiOperation({
    summary: 'Preview payment schedule for loan parameters',
    description: 'Generates a preview of the amortization schedule without creating a loan',
  })
  @ApiQuery({ type: LoanCalculationDto })
  @ApiResponse({
    status: 200,
    description: 'Payment schedule preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        monthlyPayment: { type: 'number', example: 1342.05 },
        totalPayments: { type: 'integer', example: 360 },
        totalInterest: { type: 'number', example: 233138.4 },
        schedule: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              payment: { type: 'integer', example: 1 },
              principal: { type: 'number', example: 563.89 },
              interest: { type: 'number', example: 1145.83 },
              balance: { type: 'number', example: 249436.11 },
              date: { type: 'string', format: 'date', example: '2024-02-15' },
            },
          },
        },
      },
    },
  })
  previewPaymentSchedule(@Query() query: LoanCalculationDto): unknown {
    const result = this.loansService.calculateLoanMetrics(query);

    return {
      monthlyPayment: result.monthlyPayment,
      totalPayments: result.summary.totalPayments,
      totalInterest: result.totalInterest,
      schedule: result.amortizationSchedule.map(entry => ({
        payment: entry.installmentNumber,
        principal: entry.principalAmount,
        interest: entry.interestAmount,
        balance: entry.remainingBalance,
        date: entry.dueDate,
      })),
    };
  }
}
