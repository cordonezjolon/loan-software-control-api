import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanConfiguration } from '../loans/entities/loan-configuration.entity';
import { InterestRateHistory } from '../loans/entities/interest-rate-history.entity';
import { LoanInstallment } from '../installments/entities/loan-installment.entity';
import { LoanPayment } from '../payments/entities/loan-payment.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'loan_management'),
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
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}