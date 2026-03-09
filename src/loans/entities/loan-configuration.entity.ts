import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoanType } from './loan.entity';

@Entity('loan_configurations')
export class LoanConfiguration {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Configuration unique identifier' })
  id: string;

  @Column({ type: 'enum', enum: LoanType })
  @ApiProperty({ description: 'Loan type', enum: LoanType })
  loanType: LoanType;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  @ApiProperty({ description: 'Base interest rate' })
  baseInterestRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  @ApiProperty({ description: 'Risk adjustment factor', required: false })
  riskAdjustment: number;

  @Column({ default: true })
  @ApiProperty({ description: 'Whether configuration is active' })
  isActive: boolean;

  @CreateDateColumn()
  @ApiProperty({ description: 'Configuration creation date' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Configuration last update date' })
  updatedAt: Date;
}