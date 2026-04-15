import { LoanCalculationService } from './loan-calculation.service';

describe('LoanCalculationService.calculateFlatRateEarlySettlement', () => {
  let service: LoanCalculationService;

  beforeEach(() => {
    service = new LoanCalculationService();
  });

  it('applies the rebate only to remaining scheduled interest', () => {
    const result = service.calculateFlatRateEarlySettlement({
      principal: 15000,
      annualRate: 0.05,
      termInMonths: 12,
      paidInstallments: 3,
      rebatePercentage: 0.2,
    });

    expect(result).toEqual({
      remainingInstallments: 9,
      remainingPrincipal: 11250,
      scheduledRemainingInterest: 6750,
      rebateAmount: 1350,
      settlementAmount: 9900,
    });
  });

  it('does not reduce the settlement below principal when rebate is 100%', () => {
    const result = service.calculateFlatRateEarlySettlement({
      principal: 15000,
      annualRate: 0.05,
      termInMonths: 12,
      paidInstallments: 3,
      rebatePercentage: 1,
    });

    expect(result.remainingPrincipal).toBe(11250);
    expect(result.scheduledRemainingInterest).toBe(6750);
    expect(result.rebateAmount).toBe(6750);
    expect(result.settlementAmount).toBe(4500);
  });
});

describe('LoanCalculationService.calculateDecliningBalanceEarlySettlement', () => {
  let service: LoanCalculationService;

  beforeEach(() => {
    service = new LoanCalculationService();
  });

  it('adds current-month interest to remaining principal', () => {
    const result = service.calculateDecliningBalanceEarlySettlement({
      remainingPrincipal: 15000,
      annualRate: 0.16,
    });

    expect(result.currentPeriodInterest).toBe(200);
    expect(result.settlementAmount).toBe(15200);
  });

  it('does not add interest when annual rate is zero', () => {
    const result = service.calculateDecliningBalanceEarlySettlement({
      remainingPrincipal: 15000,
      annualRate: 0,
    });

    expect(result.currentPeriodInterest).toBe(0);
    expect(result.settlementAmount).toBe(15000);
  });
});
