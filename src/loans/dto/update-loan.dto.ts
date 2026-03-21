import { IsOptional, IsEnum, IsDateString, IsUUID, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LoanStatus, LoanType, LoanPurpose } from '../entities/loan.entity';

export class UpdateLoanDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(0.35)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Updated annual interest rate as decimal',
    minimum: 0.01,
    maximum: 0.35,
    example: 0.055,
    type: 'number',
    format: 'decimal'
  })
  interestRate?: number;

  @IsOptional()
  @IsEnum(LoanStatus)
  @ApiPropertyOptional({ 
    description: 'Updated loan status',
    enum: LoanStatus,
    example: LoanStatus.APPROVED
  })
  status?: LoanStatus;

  @IsOptional()
  @IsEnum(LoanType)
  @ApiPropertyOptional({ 
    description: 'Updated loan type',
    enum: LoanType,
    example: LoanType.MORTGAGE
  })
  loanType?: LoanType;

  @IsOptional()
  @IsEnum(LoanPurpose)
  @ApiPropertyOptional({ 
    description: 'Updated loan purpose',
    enum: LoanPurpose,
    example: LoanPurpose.HOME_PURCHASE
  })
  loanPurpose?: LoanPurpose;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Updated loan start date (ISO 8601 format)',
    example: '2024-01-15',
    type: 'string',
    format: 'date'
  })
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.10)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Updated risk adjustment factor',
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
    description: 'Updated down payment amount',
    minimum: 0,
    example: 50000,
    type: 'number',
    format: 'decimal'
  })
  downPayment?: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Updated loan officer ID',
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