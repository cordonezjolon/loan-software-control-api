import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInterestCalculationAndPrepayment1701234567891 implements MigrationInterface {
  name = 'AddInterestCalculationAndPrepayment1701234567891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      CREATE TYPE "public"."interest_calculation_method_enum" AS ENUM('flat_rate', 'declining_balance')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."prepayment_action_enum" AS ENUM('reduce_term', 'reduce_installment')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."payment_type_enum" AS ENUM('installment', 'prepayment', 'settlement')
    `);

    // Add new columns to loans table
    await queryRunner.query(`
      ALTER TABLE "loans"
        ADD COLUMN "interestCalculationMethod" "public"."interest_calculation_method_enum"
          NOT NULL DEFAULT 'declining_balance',
        ADD COLUMN "earlySettlementRebatePercentage" DECIMAL(5,4),
        ADD COLUMN "prepaymentAction" "public"."prepayment_action_enum"
          DEFAULT 'reduce_term'
    `);

    // Add new columns to loan_payments table
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
        ADD COLUMN "paymentType" "public"."payment_type_enum"
          NOT NULL DEFAULT 'installment',
        ADD COLUMN "loanId" UUID
    `);

    // Make installmentId nullable (prepayment and settlement records don't link to an installment)
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
        ALTER COLUMN "installmentId" DROP NOT NULL
    `);

    // Add foreign key for loanId in loan_payments
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
        ADD CONSTRAINT "FK_loan_payments_loan"
        FOREIGN KEY ("loanId") REFERENCES "loans"("id")
        ON DELETE SET NULL
    `);

    // Index loanId for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_loan_payments_loanId"
        ON "loan_payments" ("loanId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_loan_payments_loanId"`);
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
        DROP CONSTRAINT "FK_loan_payments_loan"
    `);
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
        ALTER COLUMN "installmentId" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
        DROP COLUMN "loanId",
        DROP COLUMN "paymentType"
    `);
    await queryRunner.query(`
      ALTER TABLE "loans"
        DROP COLUMN "prepaymentAction",
        DROP COLUMN "earlySettlementRebatePercentage",
        DROP COLUMN "interestCalculationMethod"
    `);
    await queryRunner.query(`DROP TYPE "public"."payment_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."prepayment_action_enum"`);
    await queryRunner.query(`DROP TYPE "public"."interest_calculation_method_enum"`);
  }
}
