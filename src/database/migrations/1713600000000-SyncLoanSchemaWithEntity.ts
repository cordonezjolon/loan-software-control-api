import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncLoanSchemaWithEntity1713600000000 implements MigrationInterface {
  name = 'SyncLoanSchemaWithEntity1713600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Keep existing enum names but add new values required by current entity.
    await queryRunner.query(`ALTER TYPE "loan_type" ADD VALUE IF NOT EXISTS 'student'`);
    await queryRunner.query(`ALTER TYPE "loan_type" ADD VALUE IF NOT EXISTS 'credit_line'`);

    await queryRunner.query(`ALTER TYPE "loan_status" ADD VALUE IF NOT EXISTS 'under_review'`);
    await queryRunner.query(`ALTER TYPE "loan_status" ADD VALUE IF NOT EXISTS 'rejected'`);
    await queryRunner.query(`ALTER TYPE "loan_status" ADD VALUE IF NOT EXISTS 'completed'`);
    await queryRunner.query(`ALTER TYPE "loan_status" ADD VALUE IF NOT EXISTS 'closed'`);

    // TypeORM default enum name for Loan.loanPurpose.
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."loans_loanpurpose_enum" AS ENUM(
          'home_purchase',
          'refinance',
          'home_improvement',
          'debt_consolidation',
          'auto_purchase',
          'business_expansion',
          'equipment_purchase',
          'working_capital',
          'education',
          'medical_expenses',
          'vacation',
          'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "loanPurpose" "public"."loans_loanpurpose_enum"`);
    await queryRunner.query(`ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "riskAdjustment" numeric(5,4)`);
    await queryRunner.query(`ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "downPayment" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "loanOfficerId" character varying`);

    // Backfill existing rows so the column can be not-null like in the current entity.
    await queryRunner.query(`UPDATE "loans" SET "loanPurpose" = 'other' WHERE "loanPurpose" IS NULL`);
    await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "loanPurpose" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN IF EXISTS "loanOfficerId"`);
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN IF EXISTS "downPayment"`);
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN IF EXISTS "riskAdjustment"`);
    await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN IF EXISTS "loanPurpose"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loans_loanpurpose_enum"`);

    // Enum values on loan_type / loan_status are intentionally not removed in down migration.
    // PostgreSQL does not support dropping enum labels safely across versions.
  }
}
