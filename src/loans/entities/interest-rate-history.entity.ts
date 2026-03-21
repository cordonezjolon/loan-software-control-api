import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoanType } from './loan.entity';

@Entity('interest_rate_history')
export class InterestRateHistory {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'History record unique identifier' })
  id: string;

  @Column({ type: 'enum', enum: LoanType })
  @ApiProperty({ description: 'Loan type', enum: LoanType })
  loanType: LoanType;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  @ApiProperty({ description: 'Previous interest rate', required: false })
  oldRate?: number;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  @ApiProperty({ description: 'New interest rate' })
  newRate: number;

  @Column({ type: 'timestamp' })
  @ApiProperty({ description: 'Date when rate change becomes effective' })
  effectiveDate: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Reason for rate change', required: false })
  reason?: string;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'User who made the change', required: false })
  changedBy?: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'Record creation date' })
  createdAt: Date;
}