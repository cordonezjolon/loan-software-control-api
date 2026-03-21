import { IsNotEmpty, IsNumber, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LoanType } from '../entities/loan.entity';

export class LoanCalculationDto {
  @IsNumber()
  @Min(1000, { message: 'Principal amount must be at least $1,000' })
  @Max(10000000, { message: 'Principal amount cannot exceed $10,000,000' })
  @Transform(({ value }) => parseFloat(value))
  @ApiProperty({ 
    description: 'Principal loan amount for calculation',
    minimum: 1000,
    maximum: 10000000,
    example: 250000,
    type: 'number',
    format: 'decimal'
  })
  principal: number;

  @IsNumber()
  @Min(0.001, { message: 'Interest rate must be positive' })
  @Max(0.50, { message: 'Interest rate cannot exceed 50%' })
  @Transform(({ value }) => parseFloat(value))
  @ApiProperty({ 
    description: 'Annual interest rate as decimal (e.g., 0.05 for 5%)',
    minimum: 0.001,
    maximum: 0.50,
    example: 0.055,
    type: 'number',
    format: 'decimal'
  })
  interestRate: number;

  @IsInt()
  @Min(1, { message: 'Term must be at least 1 month' })
  @Max(480, { message: 'Term cannot exceed 40 years (480 months)' })
  @Transform(({ value }) => parseInt(value))
  @ApiProperty({ 
    description: 'Loan term in months',
    minimum: 1,
    maximum: 480,
    example: 360,
    type: 'integer'
  })
  termInMonths: number;

  @IsOptional()
  @IsEnum(LoanType)
  @ApiPropertyOptional({ 
    description: 'Type of loan for calculation',
    enum: LoanType,
    example: LoanType.MORTGAGE
  })
  loanType?: LoanType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Down payment amount (affects loan-to-value ratio)',
    minimum: 0,
    example: 50000,
    type: 'number',
    format: 'decimal'
  })
  downPayment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.10)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Additional risk-based adjustment',
    minimum: 0,
    maximum: 0.10,
    example: 0.005,
    type: 'number',
    format: 'decimal'
  })
  riskAdjustment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Extra monthly payment amount for early payoff calculation',
    minimum: 0,
    example: 200,
    type: 'number',
    format: 'decimal'
  })
  extraPayment?: number;
}

export class LoanCalculationResultDto {
  @ApiProperty({ 
    description: 'Monthly payment amount',
    example: 1342.05,
    type: 'number',
    format: 'decimal'
  })
  monthlyPayment: number;

  @ApiProperty({ 
    description: 'Total interest over the loan term',
    example: 233138.40,
    type: 'number',
    format: 'decimal'
  })
  totalInterest: number;

  @ApiProperty({ 
    description: 'Total amount to be paid (principal + interest)',
    example: 483138.40,
    type: 'number',
    format: 'decimal'
  })
  totalAmount: number;

  @ApiProperty({ 
    description: 'Effective annual interest rate (including fees and adjustments)',
    example: 0.056,
    type: 'number',
    format: 'decimal'
  })
  effectiveRate: number;

  @ApiProperty({ 
    description: 'Loan-to-value ratio (for secured loans)',
    example: 0.80,
    type: 'number',
    format: 'decimal',
    nullable: true
  })
  loanToValueRatio?: number;

  @ApiProperty({ 
    description: 'Debt-to-income ratio impact',
    example: 0.28,
    type: 'number',
    format: 'decimal'
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
        dueDate: { type: 'string', format: 'date', example: '2024-02-15' }
      }
    }
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
      interestPercentage: { type: 'number', format: 'decimal', example: 48.30 }
    }
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
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  loanId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Extra monthly payment amount',
    minimum: 0,
    example: 500,
    type: 'number',
    format: 'decimal'
  })
  extraMonthlyPayment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'One-time extra payment amount',
    minimum: 0,
    example: 10000,
    type: 'number',
    format: 'decimal'
  })
  lumpSumPayment?: number;
}

export class EarlyPayoffResultDto {
  @ApiProperty({ 
    description: 'Original loan payoff date',
    example: '2054-01-15',
    type: 'string',
    format: 'date'
  })
  originalPayoffDate: string;

  @ApiProperty({ 
    description: 'New payoff date with extra payments',
    example: '2049-08-15',
    type: 'string',
    format: 'date'
  })
  newPayoffDate: string;

  @ApiProperty({ 
    description: 'Time saved in months',
    example: 54,
    type: 'integer'
  })
  monthsSaved: number;

  @ApiProperty({ 
    description: 'Total interest saved',
    example: 47250.80,
    type: 'number',
    format: 'decimal'
  })
  interestSaved: number;

  @ApiProperty({ 
    description: 'Total extra payments made',
    example: 32500.00,
    type: 'number',
    format: 'decimal'
  })
  totalExtraPayments: number;

  @ApiProperty({ 
    description: 'Net savings (interest saved minus extra payments)',
    example: 14750.80,
    type: 'number',
    format: 'decimal'
  })
  netSavings: number;
}