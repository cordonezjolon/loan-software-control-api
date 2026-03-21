import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanType } from '@/loans/entities/loan.entity';
import { LoanConfiguration } from '@/loans/entities/loan-configuration.entity';
import { InterestRateHistory } from '@/loans/entities/interest-rate-history.entity';
import { RiskProfile } from './loan-calculation.service';

export interface RateBreakdown {
  baseRate: number;
  riskAdjustment: number;
  creditScoreAdjustment: number;
  debtToIncomeAdjustment: number;
  employmentAdjustment: number;
  finalRate: number;
}

@Injectable()
export class InterestRateService {
  private readonly logger = new Logger(InterestRateService.name);

  constructor(
    @InjectRepository(LoanConfiguration)
    private readonly loanConfigRepository: Repository<LoanConfiguration>,
    @InjectRepository(InterestRateHistory)
    private readonly rateHistoryRepository: Repository<InterestRateHistory>,
  ) {}

  /**
   * Get current base rate for a specific loan type
   */
  async getBaseRate(loanType: LoanType): Promise<number> {
    const config = await this.loanConfigRepository.findOne({
      where: { loanType, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!config) {
      // Default rates if no configuration found
      const defaultRates: Record<LoanType, number> = {
        [LoanType.PERSONAL]: 0.12,
        [LoanType.AUTO]: 0.08,
        [LoanType.MORTGAGE]: 0.06,
        [LoanType.BUSINESS]: 0.10,
        [LoanType.STUDENT]: 0.065,
        [LoanType.CREDIT_LINE]: 0.15,
      };
      return defaultRates[loanType] || 0.10; // fallback rate
    }

    return config.baseInterestRate;
  }

  /**
   * Calculate risk-based adjustment to interest rate
   */
  calculateRiskAdjustment(riskProfile: RiskProfile): RateBreakdown {
    const creditScoreAdjustment = this.getCreditScoreAdjustment(riskProfile.creditScore);
    const debtToIncomeAdjustment = this.getDebtToIncomeAdjustment(riskProfile.debtToIncomeRatio);
    const employmentAdjustment = this.getEmploymentAdjustment(riskProfile.employmentYears);

    const totalRiskAdjustment = creditScoreAdjustment + debtToIncomeAdjustment + employmentAdjustment;

    return {
      baseRate: 0,
      riskAdjustment: Math.round(totalRiskAdjustment * 10000) / 10000,
      creditScoreAdjustment,
      debtToIncomeAdjustment,
      employmentAdjustment,
      finalRate: 0,
    };
  }

  private getCreditScoreAdjustment(creditScore: number): number {
    if (creditScore >= 800) return -0.005;
    if (creditScore >= 750) return 0;
    if (creditScore >= 700) return 0.005;
    if (creditScore >= 650) return 0.01;
    if (creditScore >= 600) return 0.02;
    return 0.03;
  }

  private getDebtToIncomeAdjustment(ratio: number): number {
    if (ratio <= 0.2) return -0.0025;
    if (ratio <= 0.3) return 0;
    if (ratio <= 0.4) return 0.005;
    if (ratio <= 0.5) return 0.015;
    return 0.025;
  }

  private getEmploymentAdjustment(years: number): number {
    if (years >= 5) return -0.0025;
    if (years >= 2) return 0;
    if (years >= 1) return 0.005;
    return 0.01;
  }

  /**
   * Get current interest rate with risk adjustment
   */
  async getCurrentRate(loanType: LoanType, riskProfile?: RiskProfile): Promise<number> {
    const baseRate = await this.getBaseRate(loanType);
    
    if (!riskProfile) {
      return baseRate;
    }

    const rateBreakdown = this.calculateRiskAdjustment(riskProfile);
    const finalRate = baseRate + rateBreakdown.riskAdjustment;

    // Cap the final rate between 0.01% and 50%
    return Math.max(0.0001, Math.min(0.50, finalRate));
  }

  /**
   * Get rate with detailed breakdown
   */
  async estimateRateWithBreakdown(loanType: LoanType, riskProfile: RiskProfile): Promise<RateBreakdown> {
    const baseRate = await this.getBaseRate(loanType);
    const rateBreakdown = this.calculateRiskAdjustment(riskProfile);
    
    rateBreakdown.baseRate = baseRate;
    rateBreakdown.finalRate = Math.max(0.0001, Math.min(0.50, baseRate + rateBreakdown.riskAdjustment));

    this.logger.log(`Rate breakdown generated for ${loanType}: Base ${(baseRate * 100).toFixed(2)}%, Final ${(rateBreakdown.finalRate * 100).toFixed(2)}%`);

    return rateBreakdown;
  }

  /**
   * Get all current rates by loan type
   */
  async getAllCurrentRates(): Promise<Record<LoanType, number>> {
    const rates = {} as Record<LoanType, number>;
    
    for (const loanType of Object.values(LoanType)) {
      rates[loanType] = await this.getBaseRate(loanType);
    }

    return rates;
  }

  /**
   * Update base rate for a loan type and log the change
   */
  async updateInterestRate(loanType: LoanType, newRate: number, changeReason?: string): Promise<void> {
    // Deactivate current configuration
    await this.loanConfigRepository.update(
      { loanType, isActive: true },
      { isActive: false }
    );

    // Create new configuration
    const newConfig = this.loanConfigRepository.create({
      loanType,
      baseInterestRate: newRate,
      isActive: true,
    });

    await this.loanConfigRepository.save(newConfig);

    // Log the rate change
    const rateHistory = this.rateHistoryRepository.create({
      loanType,
      oldRate: await this.getBaseRate(loanType),
      newRate,
      effectiveDate: new Date(),
      reason: changeReason || 'Rate update',
    });

    await this.rateHistoryRepository.save(rateHistory);

    this.logger.log(`Interest rate updated for ${loanType}: ${(newRate * 100).toFixed(2)}%`);
  }

  /**
   * Get rate history for a loan type
   */
  async getRateHistory(loanType: LoanType, limit: number = 10): Promise<InterestRateHistory[]> {
    return this.rateHistoryRepository.find({
      where: { loanType },
      order: { effectiveDate: 'DESC' },
      take: limit,
    });
  }

  /**
   * Calculate affordability based on income and rate
   */
  calculateAffordability(monthlyIncome: number, interestRate: number, termInMonths: number, maxDebtRatio: number = 0.28): {
    maxLoanAmount: number;
    maxMonthlyPayment: number;
  } {
    const maxMonthlyPayment = monthlyIncome * maxDebtRatio;
    
    // Calculate max loan amount based on payment capacity
    let maxLoanAmount = 0;
    if (interestRate > 0) {
      const monthlyRate = interestRate / 12;
      const denominator = monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
      const numerator = Math.pow(1 + monthlyRate, termInMonths) - 1;
      maxLoanAmount = maxMonthlyPayment * (numerator / denominator);
    } else {
      maxLoanAmount = maxMonthlyPayment * termInMonths;
    }

    return {
      maxLoanAmount: Math.round(maxLoanAmount * 100) / 100,
      maxMonthlyPayment: Math.round(maxMonthlyPayment * 100) / 100,
    };
  }
}