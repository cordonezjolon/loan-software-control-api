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

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  @ApiProperty({ description: 'Interest rate' })
  rate: number;

  @Column({ type: 'date' })
  @ApiProperty({ description: 'Effective date' })
  effectiveDate: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Rate change reason', required: false })
  reason?: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'Record creation date' })
  createdAt: Date;
}