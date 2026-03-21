import { IsNotEmpty, IsString, IsEnum, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority, NotificationCategory } from '../types/notification.types';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ 
    description: 'Recipient user/client ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  recipientId: string;

  @IsEnum(NotificationType)
  @ApiProperty({ 
    description: 'Notification delivery type',
    enum: NotificationType,
    example: NotificationType.EMAIL
  })
  type: NotificationType;

  @IsEnum(NotificationCategory)
  @ApiProperty({ 
    description: 'Notification category',
    enum: NotificationCategory,
    example: NotificationCategory.PAYMENT_REMINDER
  })
  category: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationPriority)
  @ApiPropertyOptional({ 
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM
  })
  priority?: NotificationPriority;

  @IsString()
  @MaxLength(255)
  @ApiProperty({ 
    description: 'Notification subject/title',
    example: 'Payment Reminder - Loan #12345',
    maxLength: 255
  })
  subject: string;

  @IsString()
  @ApiProperty({ 
    description: 'Notification message content',
    example: 'Your loan payment of $1,342.05 is due on January 15, 2024.',
  })
  message: string;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Additional metadata for the notification',
    example: {
      loanId: '123e4567-e89b-12d3-a456-426614174000',
      installmentId: '123e4567-e89b-12d3-a456-426614174001',
      amount: 1342.05,
      dueDate: '2024-01-15'
    }
  })
  metadata?: Record<string, unknown>;
}

export class BulkNotificationDto {
  @IsNotEmpty()
  @ApiProperty({ 
    description: 'List of recipient IDs',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001']
  })
  recipientIds: string[];

  @IsEnum(NotificationType)
  @ApiProperty({ 
    description: 'Notification delivery type',
    enum: NotificationType,
    example: NotificationType.EMAIL
  })
  type: NotificationType;

  @IsEnum(NotificationCategory)
  @ApiProperty({ 
    description: 'Notification category',
    enum: NotificationCategory,
    example: NotificationCategory.PROMOTIONAL
  })
  category: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationPriority)
  @ApiPropertyOptional({ 
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.LOW
  })
  priority?: NotificationPriority;

  @IsString()
  @MaxLength(255)
  @ApiProperty({ 
    description: 'Notification subject/title',
    example: 'Special Loan Rates Available',
    maxLength: 255
  })
  subject: string;

  @IsString()
  @ApiProperty({ 
    description: 'Notification message template',
    example: 'Dear {{clientName}}, we have special rates available for you.',
  })
  messageTemplate: string;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Variables to replace in message template per recipient',
    example: {
      '123e4567-e89b-12d3-a456-426614174000': { clientName: 'John Doe' },
      '123e4567-e89b-12d3-a456-426614174001': { clientName: 'Jane Smith' }
    }
  })
  recipientVariables?: Record<string, Record<string, unknown>>;
}