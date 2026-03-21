import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ClientSortBy {
  NAME = 'name',
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  MONTHLY_INCOME = 'monthlyIncome',
  CREDIT_SCORE = 'creditScore',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FindClientsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ 
    description: 'Page number', 
    example: 1, 
    default: 1,
    required: false 
  })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ 
    description: 'Number of items per page', 
    example: 10, 
    default: 10,
    required: false 
  })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @ApiProperty({ 
    description: 'Search term (searches name, email)', 
    example: 'john',
    required: false 
  })
  search?: string;

  @IsOptional()
  @IsEnum(ClientSortBy)
  @ApiProperty({ 
    description: 'Sort by field',
    enum: ClientSortBy,
    default: ClientSortBy.CREATED_AT,
    required: false 
  })
  sortBy?: ClientSortBy = ClientSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  @ApiProperty({ 
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false 
  })
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ 
    description: 'Minimum credit score filter', 
    example: 600,
    required: false 
  })
  minCreditScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ 
    description: 'Minimum monthly income filter', 
    example: 3000,
    required: false 
  })
  minMonthlyIncome?: number;
}