/**
 * Loan validation & business-rule constants.
 *
 * Keep these in sync with the frontend Zod schemas in
 * loan-software-control-front/src/lib/schemas/loan.schema.ts
 */

// ─── Loan creation limits ────────────────────────────────────────────────────

/** Minimum principal amount allowed when creating a loan (USD). */
export const LOAN_MIN_PRINCIPAL = 1_000;

/** Maximum principal amount allowed when creating a loan (USD). */
export const LOAN_MAX_PRINCIPAL = 5_000_000;

/** Minimum annual interest rate as a decimal (1 %). */
export const LOAN_MIN_INTEREST_RATE = 0.01;

/** Maximum annual interest rate as a decimal (200 %). */
export const LOAN_MAX_INTEREST_RATE = 2;

/** Minimum loan term in months (6 months). */
export const LOAN_MIN_TERM_MONTHS = 6;

/** Maximum loan term in months (40 years = 480 months). */
export const LOAN_MAX_TERM_MONTHS = 480;

/** Maximum additional risk-adjustment rate as a decimal (10 %). */
export const LOAN_MAX_RISK_ADJUSTMENT = 0.1;

// ─── Loan calculation limits (more permissive, used in what-if calculators) ──

/** Minimum principal for standalone loan calculations (USD). */
export const CALC_MIN_PRINCIPAL = 1_000;

/** Maximum principal for standalone loan calculations (USD). */
export const CALC_MAX_PRINCIPAL = 10_000_000;

/** Minimum interest rate for standalone calculations (0.1 %). */
export const CALC_MIN_INTEREST_RATE = 0.001;

/** Maximum interest rate for standalone calculations (200 %). */
export const CALC_MAX_INTEREST_RATE = 2;

/** Minimum term for standalone calculations (1 month). */
export const CALC_MIN_TERM_MONTHS = 1;
