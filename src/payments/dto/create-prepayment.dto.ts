import { IsUUID, IsNumber, IsEnum, IsString, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '../entities/loan-payment.entity';
import { PrepaymentAction } from '../../shared/enums/interest-calculation.enum';

export class CreatePrepaymentDto {
  @IsUUID()
  @ApiProperty({
    description: 'ID of the declining-balance loan to prepay',
    format: 'uuid',
  })
  loanId: string;

  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({
    description: 'Extra principal amount being paid (must not exceed remaining balance)',
    minimum: 0.01,
    example: 5000,
    type: 'number',
    format: 'decimal',
  })
  amount: number;

  @IsEnum(PaymentMethod)
  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @IsDateString()
  @ApiProperty({
    description: 'Date of the prepayment (ISO 8601)',
    example: '2026-03-27',
  })
  paymentDate: string;

  @IsOptional()
  @IsEnum(PrepaymentAction)
  @ApiPropertyOptional({
    description:
      'Override the loan-level prepayment action for this payment. ' +
      'REDUCE_TERM keeps the original instalment and finishes early; ' +
      'REDUCE_INSTALLMENT keeps the term and lowers the instalment.',
    enum: PrepaymentAction,
  })
  prepaymentAction?: PrepaymentAction;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Reference number for the prepayment' })
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Notes about the prepayment' })
  notes?: string;
}
