import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './controllers/payments.controller';
import { PaymentsService } from './services/payments.service';
import { PaymentProcessorService } from './services/payment-processor.service';
import { LoanPayment } from './entities/loan-payment.entity';
import { PaymentRepository } from './repositories/payment.repository';
import { InstallmentsModule } from '../installments/installments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanPayment]),
    InstallmentsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProcessorService,
    PaymentRepository,
  ],
  exports: [
    PaymentsService,
    PaymentProcessorService,
  ],
})
export class PaymentsModule {}
