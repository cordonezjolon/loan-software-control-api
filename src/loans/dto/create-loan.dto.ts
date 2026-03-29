import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  LoanType,
  LoanPurpose,
  InterestCalculationMethod,
  PrepaymentAction,
} from '../entities/loan.entity';
import {
  LOAN_MIN_PRINCIPAL,
  LOAN_MAX_PRINCIPAL,
  LOAN_MIN_INTEREST_RATE,
  LOAN_MAX_INTEREST_RATE,
  LOAN_MIN_TERM_MONTHS,
  LOAN_MAX_TERM_MONTHS,
  LOAN_MAX_RISK_ADJUSTMENT,
} from '../../shared/constants';

export class CreateLoanDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: 'Client ID who is applying for the loan',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  clientId: string;

  @IsNumber()
  @Min(LOAN_MIN_PRINCIPAL, {
    message: `Loan amount must be at least $${LOAN_MIN_PRINCIPAL.toLocaleString()}`,
  })
  @Max(LOAN_MAX_PRINCIPAL, {
    message: `Loan amount cannot exceed $${LOAN_MAX_PRINCIPAL.toLocaleString()}`,
  })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({
    description: 'Principal loan amount in USD',
    minimum: LOAN_MIN_PRINCIPAL,
    maximum: LOAN_MAX_PRINCIPAL,
    example: 250000,
    type: 'number',
    format: 'decimal',
  })
  principal: number;

  @IsNumber()
  @Min(LOAN_MIN_INTEREST_RATE, {
    message: `Interest rate must be at least ${LOAN_MIN_INTEREST_RATE * 100}%`,
  })
  @Max(LOAN_MAX_INTEREST_RATE, {
    message: `Interest rate cannot exceed ${LOAN_MAX_INTEREST_RATE * 100}%`,
  })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({
    description: 'Annual interest rate as decimal (e.g., 0.05 for 5%)',
    minimum: LOAN_MIN_INTEREST_RATE,
    maximum: LOAN_MAX_INTEREST_RATE,
    example: 0.055,
    type: 'number',
    format: 'decimal',
  })
  interestRate: number;

  @IsInt()
  @Min(LOAN_MIN_TERM_MONTHS, {
    message: `Loan term must be at least ${LOAN_MIN_TERM_MONTHS} months`,
  })
  @Max(LOAN_MAX_TERM_MONTHS, {
    message: `Loan term cannot exceed 40 years (${LOAN_MAX_TERM_MONTHS} months)`,
  })
  @Transform(({ value }) => parseInt(value as string))
  @ApiProperty({
    description: 'Loan term in months',
    minimum: LOAN_MIN_TERM_MONTHS,
    maximum: LOAN_MAX_TERM_MONTHS,
    example: 360,
    type: 'integer',
  })
  termInMonths: number;

  @IsEnum(LoanType)
  @ApiProperty({
    description: 'Type of loan being requested',
    enum: LoanType,
    example: LoanType.MORTGAGE,
  })
  loanType: LoanType;

  @IsEnum(LoanPurpose)
  @ApiProperty({
    description: 'Purpose of the loan',
    enum: LoanPurpose,
    example: LoanPurpose.HOME_PURCHASE,
  })
  loanPurpose: LoanPurpose;

  @IsDateString()
  @ApiProperty({
    description: 'Requested loan start date (ISO 8601 format)',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  startDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Risk adjustment cannot be negative' })
  @Max(LOAN_MAX_RISK_ADJUSTMENT, {
    message: `Risk adjustment cannot exceed ${LOAN_MAX_RISK_ADJUSTMENT * 100}%`,
  })
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'Additional risk-based interest rate adjustment',
    minimum: 0,
    maximum: LOAN_MAX_RISK_ADJUSTMENT,
    example: 0.005,
    type: 'number',
    format: 'decimal',
  })
  riskAdjustment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Down payment cannot be negative' })
  @Transform(({ value }) => (value ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description: 'Down payment amount (for secured loans)',
    minimum: 0,
    example: 50000,
    type: 'number',
    format: 'decimal',
  })
  downPayment?: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: 'ID of the loan officer handling this application',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  loanOfficerId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Additional notes or comments about the loan',
    example: 'Customer provided additional documentation for income verification',
    maxLength: 1000,
  })
  notes?: string;

  @IsOptional()
  @IsEnum(InterestCalculationMethod)
  @ApiPropertyOptional({
    description:
      'Interest calculation method. FLAT_RATE: fixed interest on original principal; ' +
      'DECLINING_BALANCE: amortising (standard PMT formula). Defaults to DECLINING_BALANCE.',
    enum: InterestCalculationMethod,
    default: InterestCalculationMethod.DECLINING_BALANCE,
  })
  interestCalculationMethod?: InterestCalculationMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => (value !== undefined ? parseFloat(value as string) : undefined))
  @ApiPropertyOptional({
    description:
      'Fraction (0–1) of remaining scheduled interest to forgive on early settlement. ' +
      'Only relevant for FLAT_RATE loans. E.g. 0.5 means 50 % rebate.',
    minimum: 0,
    maximum: 1,
    example: 0.5,
    type: 'number',
    format: 'decimal',
  })
  earlySettlementRebatePercentage?: number;

  @IsOptional()
  @IsEnum(PrepaymentAction)
  @ApiPropertyOptional({
    description:
      'How to adjust the schedule when the borrower makes a principal prepayment ' +
      '(declining-balance loans only). Defaults to REDUCE_TERM.',
    enum: PrepaymentAction,
    default: PrepaymentAction.REDUCE_TERM,
  })
  prepaymentAction?: PrepaymentAction;
}
