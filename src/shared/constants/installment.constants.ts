/**
 * Installment & late-fee business-rule constants.
 */

/** Fraction of the installment total charged as a late fee each interval (5 %). */
export const LATE_FEE_PERCENTAGE = 0.05;

/**
 * Number of days between successive late-fee applications.
 * A fee is applied every N days while an installment remains overdue.
 */
export const LATE_FEE_INTERVAL_DAYS = 30;

/** Cron expression: run at midnight every day (mark overdue installments). */
export const CRON_OVERDUE_CHECK = '0 0 * * *';

/** Cron expression: run at 01:00 every day (apply late fees). */
export const CRON_LATE_FEE_APPLY = '0 1 * * *';
