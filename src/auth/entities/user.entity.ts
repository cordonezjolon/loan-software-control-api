import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  LOAN_OFFICER = 'loan_officer',
  EMPLOYEE = 'employee',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'User unique identifier' })
  id: string;

  @Column({ unique: true, length: 50 })
  @ApiProperty({ description: 'Username', example: 'john.doe' })
  username: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  @ApiProperty({ 
    description: 'User role', 
    enum: UserRole, 
    default: UserRole.EMPLOYEE 
  })
  role: UserRole;

  @CreateDateColumn()
  @ApiProperty({ description: 'User creation date' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'User last update date' })
  updatedAt: Date;
}