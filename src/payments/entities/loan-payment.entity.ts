import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoanInstallment } from '@/installments/entities/loan-installment.entity';

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  CHECK = 'check',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Distinguishes how a payment was generated:
 * - INSTALLMENT  regular monthly payment against a specific installment
 * - PREPAYMENT   extra principal payment on a declining-balance loan that
 *                triggers schedule recalculation (no installment FK)
 * - SETTLEMENT   lump-sum early settlement of a flat-rate loan
 *                (no installment FK)
 */
export enum PaymentType {
  INSTALLMENT = 'installment',
  PREPAYMENT = 'prepayment',
  SETTLEMENT = 'settlement',
}

@Entity('loan_payments')
export class LoanPayment {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Payment unique identifier' })
  id: string;

  @ManyToOne(() => LoanInstallment, installment => installment.payments, { nullable: true })
  @JoinColumn({ name: 'installmentId' })
  installment?: LoanInstallment;

  /** Direct loan reference for prepayments and settlements (no installment FK). */
  @Column({ nullable: true })
  @ApiProperty({ description: 'Loan ID (for prepayment / settlement payments)', required: false })
  loanId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.INSTALLMENT,
  })
  @ApiProperty({ description: 'Payment type', enum: PaymentType })
  paymentType: PaymentType;

  @Column({ type: 'date' })
  @ApiProperty({ description: 'Payment date' })
  paymentDate: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Payment reference number', required: false })
  referenceNumber?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Payment notes', required: false })
  notes?: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'Payment creation date' })
  createdAt: Date;
}
