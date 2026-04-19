import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncPaymentStatusEnumWithEntity1713900000000 implements MigrationInterface {
  name = 'SyncPaymentStatusEnumWithEntity1713900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'completed'`);
    await queryRunner.query(`ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'cancelled'`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum labels in-place.
    // Down migration intentionally no-op for enum label additions.
  }
}
