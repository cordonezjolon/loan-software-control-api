import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/loan-payment.entity';

export class CreateAdvancePaymentDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({
    description: 'Loan ID that will receive the advance payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  loanId: string;

  @IsNumber()
  @Min(0.01, { message: 'Advance payment amount must be at least $0.01' })
  @Transform(({ value }) => parseFloat(value as string))
  @ApiProperty({
    description: 'Advance payment lump sum amount',
    minimum: 0.01,
    example: 5000,
    type: 'number',
    format: 'decimal',
  })
  amount: number;

  @IsEnum(PaymentMethod)
  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  @IsDateString()
  @ApiProperty({
    description: 'Date when payment was made (ISO 8601 format)',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  paymentDate: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Payment reference number or transaction ID',
    example: 'TXN123456789',
    maxLength: 100,
  })
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    example: 'Client requested partial advance payment',
    maxLength: 500,
  })
  notes?: string;
}
