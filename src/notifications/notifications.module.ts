import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { LoanNotificationService } from './loan-notification.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

import { Notification } from './entities/notification.entity';
import { LoanInstallment } from '../installments/entities/loan-installment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      LoanInstallment,
      Loan,
      Client,
    ]),
    ScheduleModule.forRoot(), // Enable cron jobs for automated notifications
    ConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    LoanNotificationService,
    EmailService,
    SmsService,
  ],
  exports: [
    NotificationsService,
    LoanNotificationService,
  ],
})
export class NotificationsModule {}