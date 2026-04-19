import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnhanceUserEntityWithProfileAndAccountManagement1712431200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM type for user_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_email_verification');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await this.addColumns(queryRunner);
    await this.createIndexes(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexes(queryRunner);
    await this.dropColumns(queryRunner);

    // Drop ENUM type
    await queryRunner.query(`DROP TYPE IF EXISTS user_status`);
  }

  private async addColumns(queryRunner: QueryRunner): Promise<void> {
    const columns: TableColumn[] = [
      new TableColumn({ name: 'phoneNumber', type: 'varchar', length: '20', isNullable: true }),
      new TableColumn({ name: 'passwordResetToken', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'passwordResetTokenExpiresAt', type: 'timestamp', isNullable: true }),
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['active', 'inactive', 'suspended', 'pending_email_verification'],
        enumName: 'user_status',
        default: "'pending_email_verification'",
      }),
      new TableColumn({ name: 'emailVerified', type: 'boolean', default: false }),
      new TableColumn({ name: 'emailVerificationToken', type: 'varchar', isNullable: true }),
      new TableColumn({
        name: 'emailVerificationTokenExpiresAt',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({ name: 'lastLoginAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'lastPasswordChangeAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'failedLoginAttempts', type: 'int', default: 0 }),
      new TableColumn({ name: 'lockedUntil', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'metadata', type: 'jsonb', isNullable: true }),
      new TableColumn({ name: 'deletedAt', type: 'timestamp', isNullable: true }),
    ];

    for (const column of columns) {
      await queryRunner.addColumn('users', column);
    }
  }

  private async createIndexes(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_users_email" ON "users" ("email")');
    await queryRunner.query('CREATE INDEX "IDX_users_username" ON "users" ("username")');
    await queryRunner.query('CREATE INDEX "IDX_users_role" ON "users" ("role")');
    await queryRunner.query('CREATE INDEX "IDX_users_status" ON "users" ("status")');
    await queryRunner.query('CREATE INDEX "IDX_users_deletedAt" ON "users" ("deletedAt")');
  }

  private async dropIndexes(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_email"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_username"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_role"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_deletedAt"');
  }

  private async dropColumns(queryRunner: QueryRunner): Promise<void> {
    const columnsToDrop = [
      'deletedAt',
      'metadata',
      'lockedUntil',
      'failedLoginAttempts',
      'lastPasswordChangeAt',
      'lastLoginAt',
      'emailVerificationTokenExpiresAt',
      'emailVerificationToken',
      'emailVerified',
      'status',
      'passwordResetTokenExpiresAt',
      'passwordResetToken',
      'phoneNumber',
    ];

    for (const column of columnsToDrop) {
      await queryRunner.dropColumn('users', column);
    }
  }
}
