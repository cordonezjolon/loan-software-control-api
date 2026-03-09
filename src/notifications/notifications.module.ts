import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NotificationsService } from './notifications.service';
import { LoanNotificationService } from './loan-notification.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Module({
  imports: [ConfigModule],
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