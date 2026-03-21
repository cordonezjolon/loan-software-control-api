import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController, LoanCalculationsController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';
import { LoanInstallment } from '../installments/entities/loan-installment.entity';
import { SharedModule } from '../shared/shared.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, LoanInstallment]),
    SharedModule,
    ClientsModule,
  ],
  controllers: [LoansController, LoanCalculationsController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}