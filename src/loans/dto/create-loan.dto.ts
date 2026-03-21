import { IsNotEmpty, IsNumber, IsUUID, IsEnum, IsDateString, IsOptional, Min, Max, IsInt, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LoanType, LoanPurpose } from '../entities/loan.entity';

export class CreateLoanDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ 
    description: 'Client ID who is applying for the loan',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  clientId: string;

  @IsNumber()
  @Min(1000, { message: 'Loan amount must be at least $1,000' })
  @Max(5000000, { message: 'Loan amount cannot exceed $5,000,000' })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({ 
    description: 'Principal loan amount in USD',
    minimum: 1000,
    maximum: 5000000,
    example: 250000,
    type: 'number',
    format: 'decimal'
  })
  principal: number;

  @IsNumber()
  @Min(0.01, { message: 'Interest rate must be at least 1%' })
  @Max(0.35, { message: 'Interest rate cannot exceed 35%' })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({ 
    description: 'Annual interest rate as decimal (e.g., 0.05 for 5%)',
    minimum: 0.01,
    maximum: 0.35,
    example: 0.055,
    type: 'number',
    format: 'decimal'
  })
  interestRate: number;

  @IsInt()
  @Min(6, { message: 'Loan term must be at least 6 months' })
  @Max(480, { message: 'Loan term cannot exceed 40 years (480 months)' })
  @Transform(({ value }) => parseInt(value as string))
  @ApiProperty({ 
    description: 'Loan term in months',
    minimum: 6,
    maximum: 480,
    example: 360,
    type: 'integer'
  })
  termInMonths: number;

  @IsEnum(LoanType)
  @ApiProperty({ 
    description: 'Type of loan being requested',
    enum: LoanType,
    example: LoanType.MORTGAGE
  })
  loanType: LoanType;

  @IsEnum(LoanPurpose)
  @ApiProperty({ 
    description: 'Purpose of the loan',
    enum: LoanPurpose,
    example: LoanPurpose.HOME_PURCHASE
  })
  loanPurpose: LoanPurpose;

  @IsDateString()
  @ApiProperty({ 
    description: 'Requested loan start date (ISO 8601 format)',
    example: '2024-01-15',
    type: 'string',
    format: 'date'
  })
  startDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Risk adjustment cannot be negative' })
  @Max(0.10, { message: 'Risk adjustment cannot exceed 10%' })
  @Transform(({ value }) => value ? parseFloat(value as string) : undefined)
  @ApiPropertyOptional({ 
    description: 'Additional risk-based interest rate adjustment',
    minimum: 0,
    maximum: 0.10,
    example: 0.005,
    type: 'number',
    format: 'decimal'
  })
  riskAdjustment?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Down payment cannot be negative' })
  @Transform(({ value }) => value ? parseFloat(value as string) : undefined)
  @ApiPropertyOptional({ 
    description: 'Down payment amount (for secured loans)',
    minimum: 0,
    example: 50000,
    type: 'number',
    format: 'decimal'
  })
  downPayment?: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'ID of the loan officer handling this application',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  loanOfficerId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Additional notes or comments about the loan',
    example: 'Customer provided additional documentation for income verification',
    maxLength: 1000
  })
  notes?: string;
}