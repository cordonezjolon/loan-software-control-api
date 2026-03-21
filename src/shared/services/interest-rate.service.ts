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
  async calculateRiskAdjustment(riskProfile: RiskProfile): Promise<RateBreakdown> {
    let creditScoreAdjustment = 0;
    let debtToIncomeAdjustment = 0;
    let employmentAdjustment = 0;

    // Credit score impact (higher score = lower rate)
    if (riskProfile.creditScore >= 800) {
      creditScoreAdjustment = -0.005; // 0.5% discount
    } else if (riskProfile.creditScore >= 750) {
      creditScoreAdjustment = 0; // No adjustment
    } else if (riskProfile.creditScore >= 700) {
      creditScoreAdjustment = 0.005; // 0.5% increase
    } else if (riskProfile.creditScore >= 650) {
      creditScoreAdjustment = 0.01; // 1% increase
    } else if (riskProfile.creditScore >= 600) {
      creditScoreAdjustment = 0.02; // 2% increase
    } else {
      creditScoreAdjustment = 0.03; // 3% increase
    }

    // Debt-to-income ratio impact
    if (riskProfile.debtToIncomeRatio <= 0.2) {
      debtToIncomeAdjustment = -0.0025; // 0.25% discount
    } else if (riskProfile.debtToIncomeRatio <= 0.3) {
      debtToIncomeAdjustment = 0; // No adjustment
    } else if (riskProfile.debtToIncomeRatio <= 0.4) {
      debtToIncomeAdjustment = 0.005; // 0.5% increase
    } else if (riskProfile.debtToIncomeRatio <= 0.5) {
      debtToIncomeAdjustment = 0.015; // 1.5% increase
    } else {
      debtToIncomeAdjustment = 0.025; // 2.5% increase
    }

    // Employment history impact
    if (riskProfile.employmentYears >= 5) {
      employmentAdjustment = -0.0025; // 0.25% discount
    } else if (riskProfile.employmentYears >= 2) {
      employmentAdjustment = 0; // No adjustment
    } else if (riskProfile.employmentYears >= 1) {
      employmentAdjustment = 0.005; // 0.5% increase
    } else {
      employmentAdjustment = 0.01; // 1% increase
    }

    const totalRiskAdjustment = creditScoreAdjustment + debtToIncomeAdjustment + employmentAdjustment;

    return {
      baseRate: 0, // Will be filled by caller
      riskAdjustment: Math.round(totalRiskAdjustment * 10000) / 10000,
      creditScoreAdjustment,
      debtToIncomeAdjustment,
      employmentAdjustment,
      finalRate: 0, // Will be calculated by caller
    };
  }

  /**
   * Get current interest rate with risk adjustment
   */
  async getCurrentRate(loanType: LoanType, riskProfile?: RiskProfile): Promise<number> {
    const baseRate = await this.getBaseRate(loanType);
    
    if (!riskProfile) {
      return baseRate;
    }

    const rateBreakdown = await this.calculateRiskAdjustment(riskProfile);
    const finalRate = baseRate + rateBreakdown.riskAdjustment;

    // Cap the final rate between 0.01% and 50%
    return Math.max(0.0001, Math.min(0.50, finalRate));
  }

  /**
   * Get rate with detailed breakdown
   */
  async estimateRateWithBreakdown(loanType: LoanType, riskProfile: RiskProfile): Promise<RateBreakdown> {
    const baseRate = await this.getBaseRate(loanType);
    const rateBreakdown = await this.calculateRiskAdjustment(riskProfile);
    
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