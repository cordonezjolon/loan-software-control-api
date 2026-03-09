import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Loan } from '@/loans/entities/loan.entity';
import { LoanPayment } from '@/payments/entities/loan-payment.entity';

export enum InstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
}

@Entity('loan_installments')
export class LoanInstallment {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Installment unique identifier' })
  id: string;

  @ManyToOne(() => Loan, (loan) => loan.installments)
  @JoinColumn({ name: 'loanId' })
  loan: Loan;

  @Column()
  @ApiProperty({ description: 'Installment number' })
  installmentNumber: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Principal amount' })
  principalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Interest amount' })
  interestAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Total installment amount' })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Remaining loan balance' })
  remainingBalance: number;

  @Column({ type: 'date' })
  @ApiProperty({ description: 'Payment due date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @ApiProperty({ description: 'Late fee amount' })
  lateFee: number;

  @Column({ type: 'enum', enum: InstallmentStatus, default: InstallmentStatus.PENDING })
  @ApiProperty({ description: 'Installment status', enum: InstallmentStatus })
  status: InstallmentStatus;

  @OneToMany(() => LoanPayment, (payment) => payment.installment)
  @ApiProperty({ description: 'Payments made for this installment' })
  payments: LoanPayment[];

  @CreateDateColumn()
  @ApiProperty({ description: 'Installment creation date' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Installment last update date' })
  updatedAt: Date;
}