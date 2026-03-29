import { ApiProperty } from '@nestjs/swagger';
import { InstallmentStatus } from '../../installments/entities/loan-installment.entity';

export class AdvancePaymentAllocationDto {
  @ApiProperty({ format: 'uuid' })
  installmentId: string;

  @ApiProperty()
  installmentNumber: number;

  @ApiProperty({ type: 'number', format: 'decimal' })
  allocatedAmount: number;

  @ApiProperty({ enum: InstallmentStatus })
  installmentStatus: InstallmentStatus;

  @ApiProperty({ type: 'number', format: 'decimal' })
  remainingInstallmentBalance: number;
}

export class AdvancePaymentResultDto {
  @ApiProperty({ format: 'uuid' })
  loanId: string;

  @ApiProperty({ type: 'number', format: 'decimal' })
  requestedAmount: number;

  @ApiProperty({ type: 'number', format: 'decimal' })
  allocatedAmount: number;

  @ApiProperty({ type: 'number', format: 'decimal' })
  remainingLoanBalance: number;

  @ApiProperty()
  fullyPaidOff: boolean;

  @ApiProperty({ type: () => [AdvancePaymentAllocationDto] })
  allocations: AdvancePaymentAllocationDto[];
}
