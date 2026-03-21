import { IsOptional, IsEnum, IsNumber, IsDateString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InstallmentStatus } from '../entities/loan-installment.entity';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class FindInstallmentsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter installments by loan ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  loanId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter installments by client ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  clientId?: string;

  @IsOptional()
  @IsEnum(InstallmentStatus)
  @ApiPropertyOptional({ 
    description: 'Filter installments by status',
    enum: InstallmentStatus,
    example: InstallmentStatus.PENDING
  })
  status?: InstallmentStatus;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter installments due after this date',
    example: '2024-01-01',
    type: 'string',
    format: 'date'
  })
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter installments due before this date',
    example: '2024-12-31',
    type: 'string',
    format: 'date'
  })
  dueDateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @ApiPropertyOptional({ 
    description: 'Filter installments with overdue days greater than this',
    minimum: 0,
    example: 30,
    type: 'number'
  })
  overdueDaysMin?: number;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Include only overdue installments',
    type: 'boolean',
    example: true
  })
  overdueOnly?: boolean;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort field for installments',
    enum: ['dueDate', 'installmentNumber', 'totalAmount', 'status'],
    example: 'dueDate'
  })
  sortBy?: 'dueDate' | 'installmentNumber' | 'totalAmount' | 'status';

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC'
  })
  sortOrder?: 'ASC' | 'DESC';
}