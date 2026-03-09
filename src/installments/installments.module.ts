import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InstallmentsController } from './controllers/installments.controller';
import { InstallmentsService } from './services/installments.service';
import { LoanInstallment } from './entities/loan-installment.entity';
import { InstallmentRepository } from './repositories/installment.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanInstallment]),
  ],
  controllers: [InstallmentsController],
  providers: [
    InstallmentsService,
    InstallmentRepository,
  ],
  exports: [
    InstallmentsService,
    InstallmentRepository,
  ],
})
export class InstallmentsModule {}