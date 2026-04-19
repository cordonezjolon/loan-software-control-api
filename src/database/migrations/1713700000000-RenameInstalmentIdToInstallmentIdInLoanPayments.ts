import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameInstalmentIdToInstallmentIdInLoanPayments1713700000000
  implements MigrationInterface
{
  name = 'RenameInstalmentIdToInstallmentIdInLoanPayments1713700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'loan_payments' AND column_name = 'instalmentId'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'loan_payments' AND column_name = 'installmentId'
        ) THEN
          ALTER TABLE "loan_payments"
          RENAME COLUMN "instalmentId" TO "installmentId";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'loan_payments' AND column_name = 'installmentId'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'loan_payments' AND column_name = 'instalmentId'
        ) THEN
          ALTER TABLE "loan_payments"
          RENAME COLUMN "installmentId" TO "instalmentId";
        END IF;
      END $$;
    `);
  }
}
