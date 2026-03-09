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

@Entity('loan_payments')
export class LoanPayment {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Payment unique identifier' })
  id: string;

  @ManyToOne(() => LoanInstallment, (installment) => installment.payments)
  @JoinColumn({ name: 'installmentId' })
  installment: LoanInstallment;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  status: PaymentStatus;

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