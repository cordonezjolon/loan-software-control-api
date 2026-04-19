import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { AppModule } from './app.module';
import { DatabaseExceptionFilter } from '@/shared/filters/database-exception.filter';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';

// eslint-disable-next-line max-lines-per-function
async function bootstrap(): Promise<void> {
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security middleware
  app.use(helmet());

  // Global pipes for validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new DatabaseExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // CORS configuration
  const configuredOrigins = configService
    .get<string>('CORS_ORIGIN', 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOrigins = nodeEnv === 'development'
    ? Array.from(new Set([
        ...configuredOrigins,
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
      ]))
    : configuredOrigins;

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // API versioning
  app.setGlobalPrefix('api/v1');

  // Swagger documentation setup
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Loan Management API')
      .setDescription('A comprehensive loan management system built with NestJS')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'Authentication related endpoints')
      .addTag('Clients', 'Client management endpoints')
      .addTag('Loans', 'Loan management endpoints')
      .addTag('Loan Calculations', 'Loan calculation endpoints')
      .addTag('Installments', 'Installment management endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);
  logger.log(`Application running on port ${port} in ${nodeEnv} mode`);

  if (nodeEnv === 'development') {
    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Error starting application:', error);
  process.exit(1);
});