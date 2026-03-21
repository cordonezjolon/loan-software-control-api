export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationCategory {
  PAYMENT_REMINDER = 'payment_reminder',
  LOAN_APPROVAL = 'loan_approval',
  LOAN_REJECTION = 'loan_rejection',
  PAYMENT_RECEIVED = 'payment_received',
  OVERDUE_PAYMENT = 'overdue_payment',
  LOAN_COMPLETION = 'loan_completion',
  SYSTEM_ALERT = 'system_alert',
  PROMOTIONAL = 'promotional',
}

export interface NotificationTemplate {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  subject: string;
  template: string;
  variables: string[];
}

export interface NotificationRecipient {
  id: string;
  email?: string;
  phoneNumber?: string;
  preferredTypes: NotificationType[];
  timezone?: string;
}