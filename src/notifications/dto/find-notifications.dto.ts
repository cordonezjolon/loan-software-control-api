import { IsOptional, IsEnum, IsUUID, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority, NotificationCategory } from '../types/notification.types';
import { NotificationStatus } from '../entities/notification.entity';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class FindNotificationsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ 
    description: 'Filter notifications by recipient ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  recipientId?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  @ApiPropertyOptional({ 
    description: 'Filter notifications by type',
    enum: NotificationType,
    example: NotificationType.EMAIL
  })
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationCategory)
  @ApiPropertyOptional({ 
    description: 'Filter notifications by category',
    enum: NotificationCategory,
    example: NotificationCategory.PAYMENT_REMINDER
  })
  category?: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationStatus)
  @ApiPropertyOptional({ 
    description: 'Filter notifications by status',
    enum: NotificationStatus,
    example: NotificationStatus.SENT
  })
  status?: NotificationStatus;

  @IsOptional()
  @IsEnum(NotificationPriority)
  @ApiPropertyOptional({ 
    description: 'Filter notifications by priority',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH
  })
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter notifications created after this date',
    example: '2024-01-01',
    type: 'string',
    format: 'date'
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ 
    description: 'Filter notifications created before this date',
    example: '2024-12-31',
    type: 'string',
    format: 'date'
  })
  createdBefore?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ 
    description: 'Search notifications by subject or message content',
    example: 'payment reminder',
    maxLength: 255
  })
  search?: string;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Include only unread notifications',
    type: 'boolean',
    example: true
  })
  unreadOnly?: boolean;

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort field for notifications',
    enum: ['createdAt', 'sentAt', 'priority', 'category'],
    example: 'createdAt'
  })
  sortBy?: 'createdAt' | 'sentAt' | 'priority' | 'category';

  @IsOptional()
  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC'
  })
  sortOrder?: 'ASC' | 'DESC';
}