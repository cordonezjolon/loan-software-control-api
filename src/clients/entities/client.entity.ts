import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Loan } from '@/loans/entities/loan.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Client unique identifier' })
  id: string;

  @Column({ length: 50 })
  @ApiProperty({ description: 'Client first name' })
  firstName: string;

  @Column({ length: 50 })
  @ApiProperty({ description: 'Client last name' })
  lastName: string;

  @Column({ unique: true, length: 100 })
  @ApiProperty({ description: 'Client email address' })
  email: string;

  @Column({ unique: true, length: 20 })
  @ApiProperty({ description: 'Client phone number' })
  phoneNumber: string;

  @Column({ type: 'date' })
  @ApiProperty({ description: 'Client date of birth' })
  dateOfBirth: Date;

  @Column({ type: 'jsonb' })
  @ApiProperty({ description: 'Client address information' })
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @Column({ nullable: true })
  @ApiProperty({ description: 'Client occupation', required: false })
  occupation?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @ApiProperty({ description: 'Monthly income', required: false })
  monthlyIncome?: number;

  @Column({ type: 'int', nullable: true, default: 700 })
  @ApiProperty({ description: 'Client credit score (300-850)', required: false })
  creditScore?: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true, default: 0 })
  @ApiProperty({ description: 'Years of employment', required: false })
  employmentYears?: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  @ApiProperty({ description: 'Debt to income ratio (0.0 - 1.0)', required: false })
  debtToIncomeRatio?: number;

  @Column({ type: 'boolean', default: true })
  @ApiProperty({ description: 'Whether the client account is active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Additional notes about the client', required: false })
  notes?: string;

  @OneToMany(() => Loan, (loan) => loan.client)
  @ApiProperty({ description: 'Client loans', type: () => [Loan] })
  loans: Loan[];

  @CreateDateColumn()
  @ApiProperty({ description: 'Client creation date' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Client last update date' })
  updatedAt: Date;
}