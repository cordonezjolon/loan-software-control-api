import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanCalculationService } from './services/loan-calculation.service';
import { InterestRateService } from './services/interest-rate.service';
import { LoanConfiguration } from '@/loans/entities/loan-configuration.entity';
import { InterestRateHistory } from '@/loans/entities/interest-rate-history.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([LoanConfiguration, InterestRateHistory]),
  ],
  providers: [
    LoanCalculationService,
    InterestRateService,
  ],
  exports: [
    LoanCalculationService,
    InterestRateService,
  ],
})
export class SharedModule {}