import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Notification, NotificationStatus } from './entities/notification.entity';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { NotificationCategory, NotificationType, NotificationPriority } from './types/notification.types';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';
import { LoanInstallment, InstallmentStatus } from '../installments/entities/loan-installment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Client } from '../clients/entities/client.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(LoanInstallment)
    private readonly installmentRepository: Repository<LoanInstallment>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  /**
   * Create a new notification
   */
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      priority: createNotificationDto.priority || NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Attempt immediate delivery for high priority notifications
    if (savedNotification.priority === NotificationPriority.URGENT || savedNotification.priority === NotificationPriority.HIGH) {
      this.attemptDelivery(savedNotification.id).catch(error => {
        this.logger.error(`Failed to deliver high priority notification ${savedNotification.id}:`, error);
      });
    }

    return savedNotification;
  }

  /**
   * Create bulk notifications
   */
  async createBulk(bulkNotificationDto: BulkNotificationDto): Promise<{
    created: number;
    notifications: Notification[];
  }> {
    const notifications: Notification[] = [];

    for (const recipientId of bulkNotificationDto.recipientIds) {
      let message = bulkNotificationDto.messageTemplate;
      
      // Replace variables in message template
      if (bulkNotificationDto.recipientVariables && bulkNotificationDto.recipientVariables[recipientId]) {
        const variables = bulkNotificationDto.recipientVariables[recipientId];
        message = this.replaceMessageVariables(message, variables);
      }

      const notification = this.notificationRepository.create({
        recipientId,
        type: bulkNotificationDto.type,
        category: bulkNotificationDto.category,
        priority: bulkNotificationDto.priority || NotificationPriority.LOW,
        subject: bulkNotificationDto.subject,
        message,
        status: NotificationStatus.PENDING,
      });

      notifications.push(await this.notificationRepository.save(notification));
    }

    return {
      created: notifications.length,
      notifications,
    };
  }

  /**
   * Find all notifications with filtering and pagination
   */
  // eslint-disable-next-line max-lines-per-function
  async findAll(findNotificationsDto: FindNotificationsDto): Promise<PaginatedResult<Notification>> {
    const {
      page = 1,
      limit = 10,
      recipientId,
      type,
      category,
      status,
      priority,
      createdAfter,
      createdBefore,
      search,
      unreadOnly,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = findNotificationsDto;

    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    // Apply filters
    if (recipientId) {
      queryBuilder.andWhere('notification.recipientId = :recipientId', { recipientId });
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('notification.category = :category', { category });
    }

    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority });
    }

    if (createdAfter) {
      queryBuilder.andWhere('notification.createdAt >= :createdAfter', { createdAfter });
    }

    if (createdBefore) {
      queryBuilder.andWhere('notification.createdAt <= :createdBefore', { createdBefore });
    }

    if (search) {
      queryBuilder.andWhere(
        '(notification.subject ILIKE :search OR notification.message ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (unreadOnly) {
      queryBuilder.andWhere('notification.readAt IS NULL');
    }

    // Apply sorting
    queryBuilder.orderBy(`notification.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a specific notification by ID
   */
  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({ where: { id } });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.readAt) {
      return notification; // Already read
    }

    await this.notificationRepository.update(id, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });

    return this.findOne(id);
  }

  /**
   * Send payment reminder notifications
   */
  async sendPaymentReminders(daysAhead: number = 3): Promise<number> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + daysAhead);

    const upcomingInstallments = await this.installmentRepository.find({
      where: {
        dueDate: Between(startDate, endDate),
        status: InstallmentStatus.PENDING,
      },
      relations: ['loan', 'loan.client'],
    });

    let notificationsSent = 0;

    for (const installment of upcomingInstallments) {
      if (!installment.loan?.client) continue;

      await this.create({
        recipientId: installment.loan.client.id,
        type: NotificationType.EMAIL,
        category: NotificationCategory.PAYMENT_REMINDER,
        priority: NotificationPriority.HIGH,
        subject: `Payment Reminder - Due ${installment.dueDate.toLocaleDateString()}`,
        message: `Dear ${installment.loan.client.firstName},\n\nYour payment of $${installment.totalAmount} is due on ${installment.dueDate.toLocaleDateString()}.\n\nPlease ensure timely payment to avoid late fees.`,
        metadata: {
          loanId: installment.loan.id,
          installmentId: installment.id,
          amount: Number(installment.totalAmount),
        },
      });

      notificationsSent++;
    }

    return notificationsSent;
  }

  /**
   * Send loan approval notification
   */
  async sendLoanApprovalNotification(loanId: string): Promise<void> {
    const loan = await this.loanRepository.findOne({
      where: { id: loanId },
      relations: ['client'],
    });

    if (!loan?.client) {
      throw new NotFoundException('Loan or client not found');
    }

    await this.create({
      recipientId: loan.client.id,
      type: NotificationType.EMAIL,
      category: NotificationCategory.LOAN_APPROVAL,
      priority: NotificationPriority.HIGH,
      subject: 'Loan Approved!',
      message: `Dear ${loan.client.firstName},\n\nYour loan application has been approved!\n\nAmount: $${loan.principal}\nMonthly Payment: $${loan.monthlyPayment}`,
      metadata: { loanId: loan.id },
    });
  }

  /**
   * Automated job to send payment reminders
   */
  @Cron('0 9 * * *')
  async sendDailyPaymentReminders(): Promise<void> {
    try {
      const sent = await this.sendPaymentReminders(3);
      this.logger.log(`Sent ${sent} payment reminders`);
    } catch (error) {
      this.logger.error('Failed to send payment reminders:', error);
    }
  }

  /**
   * Replace variables in message template
   */
  private replaceMessageVariables(template: string, variables: Record<string, unknown>): string {
    let message = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, String(value));
    }

    return message;
  }

  /**
   * Attempt to deliver a notification
   */
  private async attemptDelivery(notificationId: string): Promise<void> {
    const notification = await this.findOne(notificationId);

    try {
      // Simulate delivery
      this.logger.log(`Delivering ${notification.type} notification: ${notification.subject}`);

      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.DELIVERED,
        sentAt: new Date(),
        deliveredAt: new Date(),
      });
    } catch (error) {
      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
        retryCount: notification.retryCount + 1,
      });
      throw error;
    }
  }
}