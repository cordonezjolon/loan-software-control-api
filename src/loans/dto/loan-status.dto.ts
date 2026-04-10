import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveLoanDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({
    description: 'Optional notes for loan approval',
    example: 'Approved after income verification and credit check',
    maxLength: 500,
  })
  notes?: string;
}

export class RejectLoanDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    description: 'Reason for loan rejection',
    example: 'Insufficient income documentation provided',
    maxLength: 500,
  })
  reason: string | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiPropertyOptional({
    description: 'Additional notes about the rejection',
    example: 'Customer can reapply after providing updated tax returns',
    maxLength: 1000,
  })
  additionalNotes?: string;
}

export class LoanStatusUpdateDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    description: 'Reason or notes for status change',
    example: 'Customer requested loan cancellation due to changed circumstances',
    maxLength: 500,
  })
  reason: string | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiPropertyOptional({
    description: 'Additional details about the status change',
    example: 'No penalty fees applied due to cancellation within grace period',
    maxLength: 1000,
  })
  notes?: string;
}
