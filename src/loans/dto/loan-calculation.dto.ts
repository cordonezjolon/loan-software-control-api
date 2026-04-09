import { IsNotEmpty, IsNumber, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LoanType, InterestCalculationMethod } from '../entities/loan.entity';
import {
  CALC_MIN_PRINCIPAL,
  CALC_MAX_PRINCIPAL,
  CALC_MIN_INTEREST_RATE,
  CALC_MAX_INTEREST_RATE,
  CALC_MIN_TERM_MONTHS,
  LOAN_MAX_TERM_MONTHS,
  LOAN_MAX_RISK_ADJUSTMENT,
} from '../../shared/constants';

export class LoanCalculationDto {
  @IsNumber()
  @Min(CALC_MIN_PRINCIPAL, {
    message: `Principal amount must be at least $${CALC_MIN_PRINCIPAL.toLocaleString()}`,
  })
  @Max(CALC_MAX_PRINCIPAL, {
    message: `Principal amount cannot exceed $${CALC_MAX_PRINCIPAL.toLocaleString()}`,
  })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({
    description: 'Principal loan amount for calculation',
    minimum: CALC_MIN_PRINCIPAL,
    maximum: CALC_MAX_PRINCIPAL,
    example: 250000,
    type: 'number',
    format: 'decimal',
  })
  principal: number;

  @IsNumber()
  @Min(CALC_MIN_INTEREST_RATE, { message: 'Interest rate must be positive' })
  @Max(CALC_MAX_INTEREST_RATE, {
    message: `Interest rate cannot exceed ${CALC_MAX_INTEREST_RATE * 100}%`,
  })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({
    description:
      'Interest rate as decimal. For DECLINING_BALANCE it is annual (e.g., 0.12 = 12%/year). For FLAT_RATE it is per installment on original principal (e.g., 0.05 = 5% each installment).',
    minimum: CALC_MIN_INTEREST_RATE,
    maximum: CALC_MAX_INTEREST_RATE,
    example: 0.055,
    type: 'number',
    format: 'decimal',
  })
  interestRate: number;

  @IsInt()
  @Min(CALC_MIN_TERM_MONTHS, { message: `Term must be at least ${CALC_MIN_TERM_MONTHS} month` })
  @Max(LOAN_MAX_TERM_MONTHS, {
    message: `Term cannot exceed 40 years (${LOAN_MAX_TERM_MONTHS} months)`,
  })
  @Transform(({ value }) => parseInt(value as string))
  @ApiProperty({
    description: 'Loan term in months',
    minimum: CALC_MIN_TERM_MONTHS,
    maximum: LOAN_MAX_TERM_MONTHS,
    example: 360,
    type: 'integer',
  })
  termInMonths: number;

  @IsOptional()
  @IsEnum(LoanType)
  @ApiPropertyOptional({
    description: 'Type of loan for calculation',
    enum: LoanType,
    example: LoanType.MORTGAGE,
  })
  loanType?: LoanType;

  @IsOptional()
  @IsEnum(InterestCalculationMethod)
  @ApiPropertyOptional({
    description:
      'How interest is applied. FLAT_RATE uses a fixed interest amount on the original principal per installment. DECLINING_BALANCE uses annual rate / 12 on the remaining balance.',
    enum: InterestCalculationMethod,
    default: InterestCalculationMethod.DECLINING_BALANCE,
  })
  interestCalculationMethod?: InterestCalculationMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'Down payment amount (affects loan-to-value ratio)',
    minimum: 0,
    example: 50000,
    type: 'number',
    format: 'decimal',
  })
  downPayment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(LOAN_MAX_RISK_ADJUSTMENT)
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'Additional risk-based adjustment',
    minimum: 0,
    maximum: LOAN_MAX_RISK_ADJUSTMENT,
    example: 0.005,
    type: 'number',
    format: 'decimal',
  })
  riskAdjustment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'Extra monthly payment amount for early payoff calculation',
    minimum: 0,
    example: 200,
    type: 'number',
    format: 'decimal',
  })
  extraPayment?: number;
}

export class LoanCalculationResultDto {
  @ApiProperty({
    description: 'Monthly payment amount',
    example: 1342.05,
    type: 'number',
    format: 'decimal',
  })
  monthlyPayment: number;

  @ApiProperty({
    description: 'Total interest over the loan term',
    example: 233138.4,
    type: 'number',
    format: 'decimal',
  })
  totalInterest: number;

  @ApiProperty({
    description: 'Total amount to be paid (principal + interest)',
    example: 483138.4,
    type: 'number',
    format: 'decimal',
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Effective annual interest rate (including fees and adjustments)',
    example: 0.056,
    type: 'number',
    format: 'decimal',
  })
  effectiveRate: number;

  @ApiProperty({
    description: 'Loan-to-value ratio (for secured loans)',
    example: 0.8,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  loanToValueRatio?: number;

  @ApiProperty({
    description: 'Debt-to-income ratio impact',
    example: 0.28,
    type: 'number',
    format: 'decimal',
  })
  debtToIncomeImpact: number;

  @ApiProperty({
    description: 'Amortization schedule for each payment',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        installmentNumber: { type: 'integer', example: 1 },
        principalAmount: { type: 'number', format: 'decimal', example: 563.89 },
        interestAmount: { type: 'number', format: 'decimal', example: 1145.83 },
        totalAmount: { type: 'number', format: 'decimal', example: 1342.05 },
        remainingBalance: { type: 'number', format: 'decimal', example: 249436.11 },
        dueDate: { type: 'string', format: 'date', example: '2024-02-15' },
      },
    },
  })
  amortizationSchedule: Array<{
    installmentNumber: number;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    remainingBalance: number;
    dueDate: string;
  }>;

  @ApiProperty({
    description: 'Summary statistics for the loan',
    type: 'object',
    properties: {
      totalPayments: { type: 'integer', example: 360 },
      firstPaymentDate: { type: 'string', format: 'date', example: '2024-01-15' },
      lastPaymentDate: { type: 'string', format: 'date', example: '2054-01-15' },
      interestPercentage: { type: 'number', format: 'decimal', example: 48.3 },
    },
  })
  summary: {
    totalPayments: number;
    firstPaymentDate: string;
    lastPaymentDate: string;
    interestPercentage: number;
  };
}

export class EarlyPayoffCalculationDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'Loan ID for early payoff calculation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  loanId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'Extra monthly payment amount',
    minimum: 0,
    example: 500,
    type: 'number',
    format: 'decimal',
  })
  extraMonthlyPayment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'One-time extra payment amount',
    minimum: 0,
    example: 10000,
    type: 'number',
    format: 'decimal',
  })
  lumpSumPayment?: number;
}

export class EarlyPayoffResultDto {
  @ApiProperty({
    description: 'Original loan payoff date',
    example: '2054-01-15',
    type: 'string',
    format: 'date',
  })
  originalPayoffDate: string;

  @ApiProperty({
    description: 'New payoff date with extra payments',
    example: '2049-08-15',
    type: 'string',
    format: 'date',
  })
  newPayoffDate: string;

  @ApiProperty({
    description: 'Time saved in months',
    example: 54,
    type: 'integer',
  })
  monthsSaved: number;

  @ApiProperty({
    description: 'Total interest saved',
    example: 47250.8,
    type: 'number',
    format: 'decimal',
  })
  interestSaved: number;

  @ApiProperty({
    description: 'Total extra payments made',
    example: 32500.0,
    type: 'number',
    format: 'decimal',
  })
  totalExtraPayments: number;

  @ApiProperty({
    description: 'Net savings (interest saved minus extra payments)',
    example: 14750.8,
    type: 'number',
    format: 'decimal',
  })
  netSavings: number;
}
