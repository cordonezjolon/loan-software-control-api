import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrepaymentAction } from '../../shared/enums/interest-calculation.enum';

export class PrepaymentInstallmentDto {
  @ApiProperty({ description: 'Installment number' })
  installmentNumber: number;

  @ApiProperty({ description: 'Due date (ISO date string)' })
  dueDate: string;

  @ApiProperty({ description: 'Principal component' })
  principalAmount: number;

  @ApiProperty({ description: 'Interest component' })
  interestAmount: number;

  @ApiProperty({ description: 'Total instalment amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Remaining loan balance after this instalment' })
  remainingBalance: number;
}

export class PrepaymentResultDto {
  @ApiProperty({ description: 'Loan ID' })
  loanId: string;

  @ApiProperty({ description: 'Principal amount prepaid' })
  prepaidAmount: number;

  @ApiProperty({ description: 'Remaining balance before prepayment' })
  previousBalance: number;

  @ApiProperty({ description: 'Remaining balance after prepayment' })
  newRemainingBalance: number;

  @ApiProperty({ description: 'Action applied to the schedule', enum: PrepaymentAction })
  prepaymentAction: PrepaymentAction;

  @ApiProperty({ description: 'Number of pending instalments before prepayment' })
  previousRemainingInstallments: number;

  @ApiProperty({ description: 'Number of pending instalments after prepayment' })
  newRemainingInstallments: number;

  @ApiPropertyOptional({ description: 'Months saved (only when REDUCE_TERM)' })
  monthsSaved?: number;

  @ApiPropertyOptional({ description: 'New monthly instalment (only when REDUCE_INSTALLMENT)' })
  newMonthlyPayment?: number;

  @ApiProperty({ description: 'Regenerated future instalment schedule' })
  newSchedule: PrepaymentInstallmentDto[];
}
