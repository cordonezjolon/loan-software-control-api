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
import { Client } from '@/clients/entities/client.entity';
import { LoanInstallment } from '@/installments/entities/loan-installment.entity';

export enum LoanType {
  PERSONAL = 'personal',
  AUTO = 'auto',
  MORTGAGE = 'mortgage',
  BUSINESS = 'business',
  STUDENT = 'student',
  CREDIT_LINE = 'credit_line',
}

export enum LoanStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFAULTED = 'defaulted',
  CLOSED = 'closed',
}

export enum LoanPurpose {
  HOME_PURCHASE = 'home_purchase',
  REFINANCE = 'refinance',
  HOME_IMPROVEMENT = 'home_improvement',
  DEBT_CONSOLIDATION = 'debt_consolidation',
  AUTO_PURCHASE = 'auto_purchase',
  BUSINESS_EXPANSION = 'business_expansion',
  EQUIPMENT_PURCHASE = 'equipment_purchase',
  WORKING_CAPITAL = 'working_capital',
  EDUCATION = 'education',
  MEDICAL_EXPENSES = 'medical_expenses',
  VACATION = 'vacation',
  OTHER = 'other',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Loan unique identifier' })
  id: string;

  @ManyToOne(() => Client, (client) => client.loans)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Loan principal amount' })
  principal: number;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  @ApiProperty({ description: 'Annual interest rate' })
  interestRate: number;

  @Column()
  @ApiProperty({ description: 'Loan term in months' })
  termInMonths: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Monthly payment amount' })
  monthlyPayment: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Total interest over loan term' })
  totalInterest: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Total amount to be paid' })
  totalAmount: number;

  @Column({ type: 'enum', enum: LoanType })
  @ApiProperty({ description: 'Loan type', enum: LoanType })
  loanType: LoanType;

  @Column({ type: 'enum', enum: LoanPurpose })
  @ApiProperty({ description: 'Purpose of the loan', enum: LoanPurpose })
  loanPurpose: LoanPurpose;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.PENDING })
  @ApiProperty({ description: 'Loan status', enum: LoanStatus })
  status: LoanStatus;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  @ApiProperty({ description: 'Risk-based interest rate adjustment', required: false })
  riskAdjustment?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @ApiProperty({ description: 'Down payment amount', required: false })
  downPayment?: number;

  @Column({ name: 'loanOfficerId', nullable: true })
  @ApiProperty({ description: 'Loan officer ID', required: false })
  loanOfficerId?: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Additional notes about the loan', required: false })
  notes?: string;

  @Column({ type: 'date' })
  @ApiProperty({ description: 'Loan start date' })
  startDate: Date;

  @Column({ type: 'date' })
  @ApiProperty({ description: 'Loan end date' })
  endDate: Date;

  @OneToMany(() => LoanInstallment, (installment) => installment.loan, {
    cascade: true,
  })
  installments: LoanInstallment[];

  @CreateDateColumn()
  @ApiProperty({ description: 'Loan creation date' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Loan last update date' })
  updatedAt: Date;
}