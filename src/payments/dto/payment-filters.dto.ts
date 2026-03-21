import { IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaymentMethod, PaymentStatus } from '../entities/loan-payment.entity';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class FindPaymentsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter payments by installment ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  installmentId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter payments by loan ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  loanId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter payments by client ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  clientId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({ 
    description: 'Filter payments by status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED
  })
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({ 
    description: 'Filter payments by payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER
  })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter payments made after this date',
    example: '2024-01-01',
    type: 'string',
    format: 'date'
  })
  paymentDateFrom?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter payments made before this date',
    example: '2024-12-31',
    type: 'string',
    format: 'date'
  })
  paymentDateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Minimum payment amount',
    minimum: 0,
    example: 100,
    type: 'number',
    format: 'decimal'
  })
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Maximum payment amount',
    minimum: 0,
    example: 5000,
    type: 'number',
    format: 'decimal'
  })
  maxAmount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Search by reference number or notes',
    example: 'TXN123',
    maxLength: 255
  })
  search?: string;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort field for payments',
    enum: ['paymentDate', 'amount', 'status', 'createdAt'],
    example: 'paymentDate'
  })
  sortBy?: 'paymentDate' | 'amount' | 'status' | 'createdAt';

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC'
  })
  sortOrder?: 'ASC' | 'DESC';
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({ 
    description: 'Updated payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED
  })
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Updated payment reference number',
    example: 'TXN123456789',
    maxLength: 100
  })
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Updated notes about the payment',
    example: 'Payment confirmed by bank',
    maxLength: 500
  })
  notes?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({ 
    description: 'Updated payment method',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER
  })
  paymentMethod?: PaymentMethod;
}

export class BatchPaymentDto {
  @IsNotEmpty()
  @ApiPropertyOptional({ 
    description: 'List of payments to process in batch',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        installmentId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', format: 'decimal' },
        paymentMethod: { enum: Object.values(PaymentMethod) },
        paymentDate: { type: 'string', format: 'date' },
        referenceNumber: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['installmentId', 'amount', 'paymentMethod', 'paymentDate']
    }
  })
  payments: Array<{
    installmentId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }>;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Batch processing notes',
    example: 'Monthly payment batch from automatic payments',
    maxLength: 255
  })
  batchNotes?: string;
}