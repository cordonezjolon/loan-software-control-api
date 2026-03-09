import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoansController } from './controllers/loans.controller';
import { LoanCalculationsController } from './controllers/loan-calculations.controller';
import { LoanConfigurationsController } from './controllers/loan-configurations.controller';
import { LoansService } from './services/loans.service';
import { LoanCalculationService } from './services/loan-calculation.service';
import { LoanConfigurationService } from './services/loan-configuration.service';
import { InterestRateService } from './services/interest-rate.service';
import { Loan } from './entities/loan.entity';
import { LoanConfiguration } from './entities/loan-configuration.entity';
import { InterestRateHistory } from './entities/interest-rate-history.entity';
import { LoanRepository } from './repositories/loan.repository';
import { LoanConfigurationRepository } from './repositories/loan-configuration.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Loan,
      LoanConfiguration,
      InterestRateHistory,
    ]),
  ],
  controllers: [
    LoansController,
    LoanCalculationsController,
    LoanConfigurationsController,
  ],
  providers: [
    LoansService,
    LoanCalculationService,
    LoanConfigurationService,
    InterestRateService,
    LoanRepository,
    LoanConfigurationRepository,
  ],
  exports: [
    LoansService,
    LoanCalculationService,
    LoanConfigurationService,
    InterestRateService,
  ],
})
export class LoansModule {}