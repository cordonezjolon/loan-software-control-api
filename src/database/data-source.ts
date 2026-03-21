import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../auth/entities/user.entity';
import { Client } from '../clients/entities/client.entity'; 
import { Loan } from '../loans/entities/loan.entity';
import { LoanConfiguration } from '../loans/entities/loan-configuration.entity';
import { InterestRateHistory } from '../loans/entities/interest-rate-history.entity';
import { LoanInstallment } from '../installments/entities/loan-installment.entity';
import { LoanPayment } from '../payments/entities/loan-payment.entity';
import { Notification } from '../notifications/entities/notification.entity';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'loan_management',
  entities: [
    User,
    Client,
    Loan,
    LoanConfiguration,
    InterestRateHistory,
    LoanInstallment,
    LoanPayment,
    Notification,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AppDataSource;