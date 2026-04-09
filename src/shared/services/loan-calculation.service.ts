import { Injectable, Logger } from '@nestjs/common';
import { InterestCalculationMethod, PrepaymentAction } from '../enums/interest-calculation.enum';

export interface AmortizationEntry {
  installmentNumber: number;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
  dueDate: Date;
}

export interface RiskProfile {
  creditScore: number;
  debtToIncomeRatio: number;
  employmentYears: number;
  monthlyIncome: number;
}

export interface LoanCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  amortizationSchedule: AmortizationEntry[];
}

@Injectable()
export class LoanCalculationService {
  private readonly logger = new Logger(LoanCalculationService.name);

  /**
   * Calculate monthly payment using the standard loan payment formula
   * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
   * Where: P = Principal, r = Monthly interest rate, n = Number of payments
   */
  calculateMonthlyPayment(principal: number, annualRate: number, termInMonths: number): number {
    if (annualRate === 0) {
      return principal / termInMonths;
    }

    const monthlyRate = annualRate / 12;
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
    const denominator = Math.pow(1 + monthlyRate, termInMonths) - 1;

    const payment = numerator / denominator;
    return Math.round(payment * 100) / 100;
  }

  /**
   * Calculate total interest over the loan term
   */
  calculateTotalInterest(principal: number, monthlyPayment: number, termInMonths: number): number {
    const totalPayments = monthlyPayment * termInMonths;
    return Math.round((totalPayments - principal) * 100) / 100;
  }

  /**
   * Generate complete amortization schedule
   */
  generateAmortizationSchedule(loan: {
    principal: number;
    interestRate: number;
    termInMonths: number;
    startDate: Date;
  }): AmortizationEntry[] {
    const { principal, interestRate, termInMonths, startDate } = loan;
    const monthlyPayment = this.calculateMonthlyPayment(principal, interestRate, termInMonths);
    const monthlyRate = interestRate / 12;
    const schedule: AmortizationEntry[] = [];
    let remainingBalance = principal;

    for (let i = 1; i <= termInMonths; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      // Ensure final payment doesn't leave a tiny balance
      if (i === termInMonths) {
        remainingBalance = 0;
      }

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNumber: i,
        principalAmount: Math.round(principalPayment * 100) / 100,
        interestAmount: Math.round(interestPayment * 100) / 100,
        totalAmount: monthlyPayment,
        remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
        dueDate,
      });
    }

    return schedule;
  }

  /**
   * Calculate comprehensive loan metrics
   */
  calculateLoanMetrics(
    principal: number,
    annualRate: number,
    termInMonths: number,
    startDate: Date,
  ): LoanCalculationResult {
    this.logger.log(
      `Calculating loan metrics for principal: $${principal}, rate: ${(annualRate * 100).toFixed(2)}%, term: ${termInMonths} months`,
    );

    const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, termInMonths);
    const totalInterest = this.calculateTotalInterest(principal, monthlyPayment, termInMonths);
    const totalAmount = principal + totalInterest;
    const amortizationSchedule = this.generateAmortizationSchedule({
      principal,
      interestRate: annualRate,
      termInMonths,
      startDate,
    });

    return {
      monthlyPayment,
      totalInterest,
      totalAmount,
      amortizationSchedule,
    };
  }

  /**
   * Calculate remaining balance at a specific point in time
   */
  calculateRemainingBalance(
    principal: number,
    annualRate: number,
    termInMonths: number,
    paymentsMade: number,
  ): number {
    if (paymentsMade >= termInMonths) return 0;
    if (paymentsMade <= 0) return principal;

    const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, termInMonths);
    const monthlyRate = annualRate / 12;
    let balance = principal;

    for (let i = 0; i < paymentsMade; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
    }

    return Math.max(0, Math.round(balance * 100) / 100);
  }

  /**
   * Calculate early payoff savings
   */
  calculateEarlyPayoffSavings(
    principal: number,
    annualRate: number,
    termInMonths: number,
    extraPayment: number,
  ): { monthsSaved: number; interestSaved: number } {
    const regularPayment = this.calculateMonthlyPayment(principal, annualRate, termInMonths);
    const totalPayment = regularPayment + extraPayment;
    const monthlyRate = annualRate / 12;

    let balance = principal;
    let months = 0;
    let totalInterestPaid = 0;

    while (balance > 0 && months < termInMonths) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = Math.min(totalPayment - interestPayment, balance);

      balance -= principalPayment;
      totalInterestPaid += interestPayment;
      months++;

      if (balance <= 0) break;
    }

    const originalTotalInterest = this.calculateTotalInterest(
      principal,
      regularPayment,
      termInMonths,
    );
    const monthsSaved = termInMonths - months;
    const interestSaved = originalTotalInterest - totalInterestPaid;

    return {
      monthsSaved,
      interestSaved: Math.round(interestSaved * 100) / 100,
    };
  }

  /**
   * Calculate complete early payoff scenario with both extra payments and lump sum
   */
  calculateEarlyPayoff(
    currentBalance: number,
    interestRate: number,
    monthlyPayment: number,
    extraMonthlyPayment: number,
    lumpSumPayment: number,
    originalPayoffDate: Date,
  ): {
    originalPayoffDate: string;
    newPayoffDate: string;
    monthsSaved: number;
    interestSaved: number;
    totalExtraPayments: number;
    netSavings: number;
  } {
    const { months, totalInterestPaid, totalExtraPayments } = this.buildPayoffSchedule(
      currentBalance,
      interestRate,
      monthlyPayment,
      extraMonthlyPayment,
      lumpSumPayment,
    );

    const originalInterestFromNow = this.calcOriginalInterest(
      currentBalance,
      interestRate,
      monthlyPayment,
      originalPayoffDate,
    );

    const remainingMonthsFromOriginal = Math.ceil(
      (originalPayoffDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000),
    );

    const newPayoffDate = new Date();
    newPayoffDate.setMonth(newPayoffDate.getMonth() + months);

    const monthsSaved = remainingMonthsFromOriginal - months;
    const interestSaved = originalInterestFromNow - totalInterestPaid;
    const netSavings = interestSaved - totalExtraPayments;

    return {
      originalPayoffDate: originalPayoffDate.toISOString().split('T')[0],
      newPayoffDate: newPayoffDate.toISOString().split('T')[0],
      monthsSaved,
      interestSaved: Math.round(interestSaved * 100) / 100,
      totalExtraPayments: Math.round(totalExtraPayments * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100,
    };
  }

  private buildPayoffSchedule(
    currentBalance: number,
    interestRate: number,
    monthlyPayment: number,
    extraMonthlyPayment: number,
    lumpSumPayment: number,
  ): { months: number; totalInterestPaid: number; totalExtraPayments: number } {
    const monthlyRate = interestRate / 12;
    let balance = currentBalance - lumpSumPayment;
    const totalMonthlyPayment = monthlyPayment + extraMonthlyPayment;
    let months = 0;
    let totalInterestPaid = 0;
    let totalExtraPayments = lumpSumPayment;
    const maxMonths = 600;

    while (balance > 0 && months < maxMonths) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = Math.min(totalMonthlyPayment - interestPayment, balance);
      balance -= principalPayment;
      totalInterestPaid += interestPayment;
      totalExtraPayments += extraMonthlyPayment;
      months++;
      if (balance <= 0.01) break;
    }

    return { months, totalInterestPaid, totalExtraPayments };
  }

  private calcOriginalInterest(
    currentBalance: number,
    interestRate: number,
    monthlyPayment: number,
    originalPayoffDate: Date,
  ): number {
    const monthlyRate = interestRate / 12;
    const remainingMonths = Math.ceil(
      (originalPayoffDate.getTime() - new Date().getTime()) / (30 * 24 * 60 * 60 * 1000),
    );
    let originalInterest = 0;
    let tempBalance = currentBalance;
    for (let i = 0; i < remainingMonths && tempBalance > 0; i++) {
      const interestPayment = tempBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      originalInterest += interestPayment;
      tempBalance -= principalPayment;
    }
    return originalInterest;
  }

  // ─── Flat-Rate (Add-On Interest) ──────────────────────────────────────────

  /**
   * Calculate high-level metrics for a flat-rate loan.
   * Interest per installment = P × rate.
   * Total interest = (P × rate) × term.
   * Monthly installment = (P / term) + (P × rate).
   */
  calculateFlatRateMetrics(
    principal: number,
    annualRate: number,
    termInMonths: number,
  ): { monthlyPayment: number; totalInterest: number; totalAmount: number } {
    const interestPerInstallment = principal * annualRate;
    const totalInterest = Math.round(interestPerInstallment * termInMonths * 100) / 100;
    const totalAmount = principal + totalInterest;
    const monthlyPayment = Math.round((totalAmount / termInMonths) * 100) / 100;
    return { monthlyPayment, totalInterest, totalAmount };
  }

  /**
   * Generate a complete amortization schedule for a flat-rate loan.
   * Every installment has the same total amount.
   * Principal and interest components are equal each month.
   */
  generateFlatRateSchedule(loan: {
    principal: number;
    annualRate: number;
    termInMonths: number;
    startDate: Date;
  }): AmortizationEntry[] {
    const { principal, annualRate, termInMonths, startDate } = loan;
    const { monthlyPayment, totalInterest } = this.calculateFlatRateMetrics(
      principal,
      annualRate,
      termInMonths,
    );
    const monthlyPrincipal = Math.round((principal / termInMonths) * 100) / 100;
    const monthlyInterest = Math.round((totalInterest / termInMonths) * 100) / 100;
    const schedule: AmortizationEntry[] = [];

    for (let i = 1; i <= termInMonths; i++) {
      const remainingBalance = Math.max(
        0,
        Math.round((principal - monthlyPrincipal * i) * 100) / 100,
      );
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        installmentNumber: i,
        principalAmount: monthlyPrincipal,
        interestAmount: monthlyInterest,
        totalAmount: monthlyPayment,
        remainingBalance,
        dueDate,
      });
    }

    return schedule;
  }

  /**
   * Calculate the early-settlement figure for a flat-rate loan.
   *
   * The customer has already paid paidInstallments × monthlyInstallment
   * (which included proportional interest).  To close early the bank
   * forgives rebatePercentage of the REMAINING scheduled interest.
   *
   * settlementAmount = remainingPrincipal − rebateAmount
   */
  calculateFlatRateEarlySettlement(params: {
    principal: number;
    annualRate: number;
    termInMonths: number;
    paidInstallments: number;
    rebatePercentage: number;
  }): {
    remainingInstallments: number;
    remainingPrincipal: number;
    scheduledRemainingInterest: number;
    rebateAmount: number;
    settlementAmount: number;
  } {
    const { principal, annualRate, termInMonths, paidInstallments, rebatePercentage } = params;
    const remainingInstallments = termInMonths - paidInstallments;
    const monthlyPrincipal = principal / termInMonths;
    const monthlyInterest = principal * annualRate;
    const remainingPrincipal = Math.round(monthlyPrincipal * remainingInstallments * 100) / 100;
    const scheduledRemainingInterest =
      Math.round(monthlyInterest * remainingInstallments * 100) / 100;
    const rebateAmount = Math.round(scheduledRemainingInterest * rebatePercentage * 100) / 100;
    const settlementAmount = Math.max(
      0,
      Math.round((remainingPrincipal - rebateAmount) * 100) / 100,
    );

    return {
      remainingInstallments,
      remainingPrincipal,
      scheduledRemainingInterest,
      rebateAmount,
      settlementAmount,
    };
  }

  // ─── Declining-Balance Prepayment ─────────────────────────────────────────

  /**
   * Regenerate the future installment schedule after a principal prepayment
   * on a declining-balance loan.
   *
   * REDUCE_TERM        – keep originalMonthlyPayment, solve for shorter term.
   * REDUCE_INSTALLMENT – keep remainingMonths, compute lower PMT.
   */
  // eslint-disable-next-line max-lines-per-function
  recalculateAfterPrepayment(params: {
    newRemainingBalance: number;
    annualRate: number;
    remainingMonths: number;
    startInstallmentNumber: number;
    nextDueDate: Date;
    prepaymentAction: PrepaymentAction;
    originalMonthlyPayment: number;
  }): AmortizationEntry[] {
    const {
      newRemainingBalance,
      annualRate,
      remainingMonths,
      startInstallmentNumber,
      nextDueDate,
      prepaymentAction,
      originalMonthlyPayment,
    } = params;

    if (newRemainingBalance <= 0) return [];

    const { monthlyPayment, newTermMonths } = this.resolveNewPaymentTerms({
      newRemainingBalance,
      annualRate,
      remainingMonths,
      prepaymentAction,
      originalMonthlyPayment,
    });

    return this.buildDecliningSchedule({
      newRemainingBalance,
      annualRate,
      monthlyPayment,
      newTermMonths,
      startInstallmentNumber,
      nextDueDate,
    });
  }

  private resolveNewPaymentTerms(params: {
    newRemainingBalance: number;
    annualRate: number;
    remainingMonths: number;
    prepaymentAction: PrepaymentAction;
    originalMonthlyPayment: number;
  }): { monthlyPayment: number; newTermMonths: number } {
    if (params.prepaymentAction === PrepaymentAction.REDUCE_INSTALLMENT) {
      return {
        monthlyPayment: this.calculateMonthlyPayment(
          params.newRemainingBalance,
          params.annualRate,
          params.remainingMonths,
        ),
        newTermMonths: params.remainingMonths,
      };
    }
    // REDUCE_TERM: keep same installment, solve for new n
    return {
      monthlyPayment: params.originalMonthlyPayment,
      newTermMonths: this.solveRemainingTerms(
        params.newRemainingBalance,
        params.annualRate,
        params.originalMonthlyPayment,
      ),
    };
  }

  private buildDecliningSchedule(params: {
    newRemainingBalance: number;
    annualRate: number;
    monthlyPayment: number;
    newTermMonths: number;
    startInstallmentNumber: number;
    nextDueDate: Date;
  }): AmortizationEntry[] {
    const {
      newRemainingBalance,
      annualRate,
      monthlyPayment,
      newTermMonths,
      startInstallmentNumber,
      nextDueDate,
    } = params;
    const monthlyRate = annualRate / 12;
    const schedule: AmortizationEntry[] = [];
    let balance = newRemainingBalance;

    for (let i = 0; i < newTermMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
      balance -= principalPayment;
      if (i === newTermMonths - 1) balance = 0;
      const dueDate = new Date(nextDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        installmentNumber: startInstallmentNumber + i,
        principalAmount: Math.round(principalPayment * 100) / 100,
        interestAmount: Math.round(interestPayment * 100) / 100,
        totalAmount: Math.round((principalPayment + interestPayment) * 100) / 100,
        remainingBalance: Math.max(0, Math.round(balance * 100) / 100),
        dueDate,
      });
    }

    return schedule;
  }

  /**
   * Solve for the number of months required to pay off `balance`
   * at `annualRate` making `monthlyPayment` each period.
   * n = -ln(1 − r·B/PMT) / ln(1+r)
   */
  private solveRemainingTerms(balance: number, annualRate: number, monthlyPayment: number): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);
    const innerArg = 1 - (monthlyRate * balance) / monthlyPayment;
    if (innerArg <= 0) return 1;
    return Math.ceil(-Math.log(innerArg) / Math.log(1 + monthlyRate));
  }

  // ─── Unified dispatcher ───────────────────────────────────────────────────

  /**
   * Dispatch schedule generation to the correct method based on
   * the loan's interest calculation method.
   */
  generateSchedule(
    loan: { principal: number; interestRate: number; termInMonths: number; startDate: Date },
    method: InterestCalculationMethod,
  ): AmortizationEntry[] {
    if (method === InterestCalculationMethod.FLAT_RATE) {
      return this.generateFlatRateSchedule({
        principal: loan.principal,
        annualRate: loan.interestRate,
        termInMonths: loan.termInMonths,
        startDate: loan.startDate,
      });
    }
    return this.generateAmortizationSchedule(loan);
  }
}
