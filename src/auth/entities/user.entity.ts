import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  LOAN_OFFICER = 'loan_officer',
  EMPLOYEE = 'employee',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_EMAIL_VERIFICATION = 'pending_email_verification',
}

@Entity('users')
@Index(['username'], { unique: true })
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['status'])
@Index(['deletedAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'User unique identifier' })
  id!: string;

  @Column({ unique: true, length: 50 })
  @ApiProperty({ description: 'Username', example: 'john.doe' })
  username!: string;

  @Column({ unique: true, length: 255 })
  @ApiProperty({ description: 'User email', example: 'john@example.com' })
  email!: string;

  @Column({ length: 100 })
  @ApiProperty({ description: 'User first name' })
  firstName!: string;

  @Column({ length: 100 })
  @ApiProperty({ description: 'User last name' })
  lastName!: string;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  @ApiProperty({ description: 'User phone number', required: false })
  phoneNumber?: string | null;

  @Column()
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: 'Hashed password (excluded in responses)' })
  passwordHash!: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: 'Password reset token (excluded in responses)' })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: 'Password reset token expiration (excluded in responses)' })
  passwordResetTokenExpiresAt?: Date | null;

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
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_EMAIL_VERIFICATION,
  })
  @ApiProperty({ 
    description: 'User account status', 
    enum: UserStatus, 
    default: UserStatus.PENDING_EMAIL_VERIFICATION 
  })
  status!: UserStatus;

  @Column({ default: false })
  @ApiProperty({ description: 'Whether user email is verified', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: 'Email verification token (excluded in responses)' })
  emailVerificationToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: 'Email verification token expiration (excluded in responses)' })
  emailVerificationTokenExpiresAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Last login date', required: false })
  lastLoginAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Last password change date', required: false })
  lastPasswordChangeAt?: Date | null;

  @Column({ default: 0 })
  @ApiProperty({ description: 'Failed login attempts counter', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Account locked until date', required: false })
  lockedUntil?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'User metadata/preferences', required: false })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  @ApiProperty({ description: 'User creation date' })
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'User last update date' })
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  @Exclude({ toPlainOnly: true })
  @ApiProperty({ description: 'User soft delete date (excluded in responses)', required: false })
  deletedAt?: Date | null;

  // Helper methods
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.deletedAt;
  }

  isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  canLogin(): boolean {
    return this.isActive() && !this.isLocked() && this.emailVerified;
  }
}