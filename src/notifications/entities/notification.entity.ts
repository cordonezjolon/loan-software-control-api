import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationPriority, NotificationCategory } from '../types/notification.types';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

@Entity('notifications')
@Index(['recipientId', 'status'])
@Index(['category', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Notification unique identifier' })
  id: string;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Recipient user/client ID' })
  recipientId: string;

  @Column({ type: 'enum', enum: NotificationType })
  @ApiProperty({ description: 'Notification delivery type', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationCategory })
  @ApiProperty({ description: 'Notification category', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  @ApiProperty({ description: 'Notification priority', enum: NotificationPriority })
  priority: NotificationPriority;

  @Column({ length: 255 })
  @ApiProperty({ description: 'Notification subject/title' })
  subject: string;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'Notification message content' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Additional metadata for the notification', required: false })
  metadata?: {
    loanId?: string;
    installmentId?: string;
    paymentId?: string;
    templateId?: string;
    variables?: Record<string, unknown>;
  };

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  @ApiProperty({ description: 'Notification status', enum: NotificationStatus })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the notification was sent', required: false })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the notification was delivered', required: false })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the notification was read', required: false })
  readAt?: Date;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Error message if delivery failed', required: false })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  @ApiProperty({ description: 'Number of retry attempts' })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Next retry attempt time', required: false })
  nextRetryAt?: Date;

  @CreateDateColumn()
  @ApiProperty({ description: 'Notification creation date' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Notification last update date' })
  updatedAt: Date;
}