/**
 * Determines how interest is computed on a loan.
 *
 * FLAT_RATE       – interest is calculated once on the original principal
 *                   for the full term. All installments are equal.
 * DECLINING_BALANCE – interest is calculated on the outstanding balance
 *                   each period (standard amortisation / PMT formula).
 */
export enum InterestCalculationMethod {
  FLAT_RATE = 'flat_rate',
  DECLINING_BALANCE = 'declining_balance',
}

/**
 * What to do with the remaining schedule after a principal prepayment
 * on a declining-balance loan.
 *
 * REDUCE_TERM        – keep the original installment amount; finish earlier.
 * REDUCE_INSTALLMENT – keep the original remaining term; lower installments.
 */
export enum PrepaymentAction {
  REDUCE_TERM = 'reduce_term',
  REDUCE_INSTALLMENT = 'reduce_installment',
}
