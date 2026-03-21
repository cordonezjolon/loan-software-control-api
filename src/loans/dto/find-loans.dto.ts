import { IsOptional, IsEnum, IsUUID, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LoanStatus, LoanType, LoanPurpose } from '../entities/loan.entity';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class FindLoansDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter loans by client ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  clientId?: string;

  @IsOptional()
  @IsEnum(LoanStatus)
  @ApiPropertyOptional({ 
    description: 'Filter loans by status',
    enum: LoanStatus,
    example: LoanStatus.ACTIVE
  })
  status?: LoanStatus;

  @IsOptional()
  @IsEnum(LoanType)
  @ApiPropertyOptional({ 
    description: 'Filter loans by type',
    enum: LoanType,
    example: LoanType.MORTGAGE
  })
  loanType?: LoanType;

  @IsOptional()
  @IsEnum(LoanPurpose)
  @ApiPropertyOptional({ 
    description: 'Filter loans by purpose',
    enum: LoanPurpose,
    example: LoanPurpose.HOME_PURCHASE
  })
  loanPurpose?: LoanPurpose;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter loans created after this date',
    example: '2024-01-01',
    type: 'string',
    format: 'date'
  })
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter loans created before this date',
    example: '2024-12-31',
    type: 'string',
    format: 'date'
  })
  startDateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value as string) : undefined)
  @ApiPropertyOptional({ 
    description: 'Minimum loan amount',
    minimum: 0,
    example: 10000,
    type: 'number',
    format: 'decimal'
  })
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value ? parseFloat(value as string) : undefined)
  @ApiPropertyOptional({ 
    description: 'Maximum loan amount',
    minimum: 0,
    example: 1000000,
    type: 'number',
    format: 'decimal'
  })
  maxAmount?: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter loans by loan officer ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  loanOfficerId?: string;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Search term for loan-related text fields',
    example: 'refinance',
    maxLength: 255
  })
  search?: string;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort field for loans',
    enum: ['createdAt', 'startDate', 'principal', 'monthlyPayment', 'status'],
    example: 'createdAt'
  })
  sortBy?: 'createdAt' | 'startDate' | 'principal' | 'monthlyPayment' | 'status';

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC'
  })
  sortOrder?: 'ASC' | 'DESC';
}