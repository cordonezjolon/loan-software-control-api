import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@/auth/auth.module';
import { ClientsModule } from '@/clients/clients.module';
import { LoansModule } from '@/loans/loans.module';
import { InstallmentsModule } from '@/installments/installments.module';
import { PaymentsModule } from '@/payments/payments.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { SharedModule } from '@/shared/shared.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.development', '.env'],
      cache: true,
    }),

    // Database module
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [{
        ttl: configService.get('THROTTLE_TTL', 60),
        limit: configService.get('THROTTLE_LIMIT', 10),
      }],
    }),

    // Logging module
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: [
          new winston.transports.Console({
            level: configService.get('LOG_LEVEL', 'info'),
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/app.log',
            level: configService.get('LOG_LEVEL', 'info'),
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        ],
      }),
    }),

    // Feature modules
    DatabaseModule,
    SharedModule,
    AuthModule,
    ClientsModule,
    LoansModule,
    InstallmentsModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}