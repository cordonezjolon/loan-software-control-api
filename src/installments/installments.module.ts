import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { InstallmentsController } from './installments.controller';
import { InstallmentsService } from './installments.service';
import { LoanInstallment } from './entities/loan-installment.entity';
import { Loan } from '../loans/entities/loan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanInstallment, Loan]),
    ScheduleModule.forRoot(), // For cron jobs
  ],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService],
})
export class InstallmentsModule {}