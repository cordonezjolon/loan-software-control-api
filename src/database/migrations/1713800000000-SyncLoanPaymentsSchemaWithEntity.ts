import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncLoanPaymentsSchemaWithEntity1713800000000
  implements MigrationInterface
{
  name = 'SyncLoanPaymentsSchemaWithEntity1713800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
      ADD COLUMN IF NOT EXISTS "paymentDate" date
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_payments"
      ADD COLUMN IF NOT EXISTS "referenceNumber" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_payments"
      ADD COLUMN IF NOT EXISTS "notes" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_payments"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'loan_payments' AND column_name = 'transactionReference'
        ) THEN
          UPDATE "loan_payments"
          SET "referenceNumber" = COALESCE("referenceNumber", "transactionReference")
          WHERE "referenceNumber" IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'loan_payments' AND column_name = 'processedAt'
        ) THEN
          UPDATE "loan_payments"
          SET "paymentDate" = COALESCE("paymentDate", "processedAt"::date, CURRENT_DATE)
          WHERE "paymentDate" IS NULL;
        ELSE
          UPDATE "loan_payments"
          SET "paymentDate" = COALESCE("paymentDate", CURRENT_DATE)
          WHERE "paymentDate" IS NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "loan_payments"
      ALTER COLUMN "paymentDate" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "loan_payments" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "loan_payments" DROP COLUMN IF EXISTS "referenceNumber"`);
    await queryRunner.query(`ALTER TABLE "loan_payments" DROP COLUMN IF EXISTS "paymentDate"`);
  }
}
