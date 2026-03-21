import { IsNotEmpty, IsNumber, IsUUID, IsEnum, IsDateString, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '../entities/loan-payment.entity';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ 
    description: 'Installment ID for this payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  installmentId: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be at least $0.01' })
  @Transform(({ value }) => parseFloat(value))
  @ApiProperty({ 
    description: 'Payment amount',
    minimum: 0.01,
    example: 1342.05,
    type: 'number',
    format: 'decimal'
  })
  amount: number;

  @IsEnum(PaymentMethod)
  @ApiProperty({ 
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER
  })
  paymentMethod: PaymentMethod;

  @IsDateString()
  @ApiProperty({ 
    description: 'Date when payment was made (ISO 8601 format)',
    example: '2024-01-15',
    type: 'string',
    format: 'date'
  })
  paymentDate: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Payment reference number or transaction ID',
    example: 'TXN123456789',
    maxLength: 100
  })
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Additional notes about the payment',
    example: 'Payment received via online banking',
    maxLength: 500
  })
  notes?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'ID of the user processing this payment',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  processedById?: string;
}