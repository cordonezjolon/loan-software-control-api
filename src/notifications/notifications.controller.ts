import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';
import { NotificationCategory, NotificationType, NotificationPriority } from './types/notification.types';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiBody({ type: CreateNotificationDto, description: 'Notification creation data' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: Notification,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid notification data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create bulk notifications' })
  @ApiBody({ type: BulkNotificationDto, description: 'Bulk notification creation data' })
  @ApiResponse({
    status: 201,
    description: 'Bulk notifications created successfully',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'number', description: 'Number of notifications created' },
        notifications: {
          type: 'array',
          items: { $ref: '#/components/schemas/Notification' },
          description: 'Array of created notifications',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk notification data',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async createBulk(@Body() bulkNotificationDto: BulkNotificationDto): Promise<{
    created: number;
    notifications: Notification[];
  }> {
    return this.notificationsService.createBulk(bulkNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'recipientId', required: false, type: String, description: 'Filter by recipient ID' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType, description: 'Filter by notification type' })
  @ApiQuery({ name: 'category', required: false, enum: NotificationCategory, description: 'Filter by category' })
  @ApiQuery({ name: 'priority', required: false, enum: NotificationPriority, description: 'Filter by priority' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in subject and message' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Show only unread notifications' })
  @ApiQuery({ name: 'createdAfter', required: false, type: String, description: 'Filter by creation date (after)' })
  @ApiQuery({ name: 'createdBefore', required: false, type: String, description: 'Filter by creation date (before)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (default: createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Notification' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(@Query() findNotificationsDto: FindNotificationsDto): Promise<PaginatedResult<Notification>> {
    return this.notificationsService.findAll(findNotificationsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Notification UUID' })
  @ApiResponse({
    status: 200,
    description: 'Notification found',
    type: Notification,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', type: String, description: 'Notification UUID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: Notification,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Notification already read',
  })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    return this.notificationsService.markAsRead(id);
  }

  @Post('payment-reminders')
  @ApiOperation({ summary: 'Send payment reminder notifications' })
  @ApiQuery({ 
    name: 'daysAhead', 
    required: false, 
    type: Number, 
    description: 'Number of days ahead to check for due payments (default: 3)' 
  })
  @ApiResponse({
    status: 200,
    description: 'Payment reminders sent successfully',
    schema: {
      type: 'object',
      properties: {
        notificationsSent: { 
          type: 'number', 
          description: 'Number of payment reminder notifications sent' 
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid days ahead parameter',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async sendPaymentReminders(
    @Query('daysAhead') daysAhead: number = 3,
  ): Promise<{ notificationsSent: number }> {
    const notificationsSent = await this.notificationsService.sendPaymentReminders(daysAhead);
    return { notificationsSent };
  }

  @Post('loan-approval/:loanId')
  @ApiOperation({ summary: 'Send loan approval notification' })
  @ApiParam({ name: 'loanId', type: String, description: 'Loan UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan approval notification sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  async sendLoanApprovalNotification(
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.sendLoanApprovalNotification(loanId);
    return { message: 'Loan approval notification sent successfully' };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get notification statistics summary' })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total notifications' },
        pending: { type: 'number', description: 'Pending notifications' },
        delivered: { type: 'number', description: 'Delivered notifications' },
        failed: { type: 'number', description: 'Failed notifications' },
        read: { type: 'number', description: 'Read notifications' },
        unread: { type: 'number', description: 'Unread notifications' },
        byType: { 
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Notification count by type',
        },
        byCategory: { 
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Notification count by category',
        },
        byPriority: { 
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Notification count by priority',
        },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getNotificationStats(): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    read: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    // This would be implemented in the service
    return {
      total: 0,
      pending: 0,
      delivered: 0,
      failed: 0,
      read: 0,
      unread: 0,
      byType: {},
      byCategory: {},
      byPriority: {},
    };
  }
}