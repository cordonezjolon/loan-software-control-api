import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../payments/entities/loan-payment.entity';
import { InterestCalculationMethod } from '../entities/loan.entity';

export class ProcessEarlySettlementDto {
  @IsEnum(PaymentMethod)
  @ApiProperty({ description: 'Payment method used to settle the loan', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @IsString()
  @ApiProperty({
    description: 'Settlement payment date (ISO 8601)',
    example: '2026-03-27',
  })
  paymentDate: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Reference number for the settlement payment' })
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Notes about the early settlement' })
  notes?: string;
}

export class EarlySettlementPreviewDto {
  @ApiProperty({ description: 'Loan ID' })
  loanId: string;

  @ApiProperty({ description: 'Interest calculation method', enum: InterestCalculationMethod })
  interestCalculationMethod: InterestCalculationMethod;

  @ApiProperty({ description: 'Number of installments already fully paid' })
  paidInstallments: number;

  @ApiProperty({ description: 'Number of installments remaining' })
  remainingInstallments: number;

  @ApiProperty({ description: 'Outstanding principal balance' })
  remainingPrincipal: number;

  @ApiProperty({
    description: 'Scheduled interest on remaining installments (flat-rate only; 0 for declining)',
  })
  scheduledRemainingInterest: number;

  @ApiProperty({ description: 'Configured rebate percentage (0–1)' })
  rebatePercentage: number;

  @ApiProperty({ description: 'Interest amount forgiven on early settlement' })
  rebateAmount: number;

  @ApiProperty({ description: 'Cash amount due to fully settle the loan today' })
  settlementAmount: number;

  @ApiProperty({ description: 'Date of the preview calculation' })
  previewDate: string;
}
