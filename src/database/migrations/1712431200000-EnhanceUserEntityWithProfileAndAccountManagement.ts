import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnhanceUserEntityWithProfileAndAccountManagement1712431200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM type for user_status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_email_verification');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new columns to users table (note: email, firstName, lastName already exist from initial schema)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phoneNumber',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetToken',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'passwordResetTokenExpiresAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['active', 'inactive', 'suspended', 'pending_email_verification'],
        enumName: 'user_status',
        default: "'pending_email_verification'",
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'emailVerified',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'emailVerificationToken',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'emailVerificationTokenExpiresAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastLoginAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastPasswordChangeAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'failedLoginAttempts',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lockedUntil',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'metadata',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'deletedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Create indexes
    await queryRunner.query('CREATE INDEX "IDX_users_email" ON "users" ("email")');
    await queryRunner.query('CREATE INDEX "IDX_users_username" ON "users" ("username")');
    await queryRunner.query('CREATE INDEX "IDX_users_role" ON "users" ("role")');
    await queryRunner.query('CREATE INDEX "IDX_users_status" ON "users" ("status")');
    await queryRunner.query('CREATE INDEX "IDX_users_deletedAt" ON "users" ("deletedAt")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_email"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_username"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_role"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_users_deletedAt"');

    // Drop columns (only the ones we added, not email/firstName/lastName which were in initial schema)
    await queryRunner.dropColumn('users', 'deletedAt');
    await queryRunner.dropColumn('users', 'metadata');
    await queryRunner.dropColumn('users', 'lockedUntil');
    await queryRunner.dropColumn('users', 'failedLoginAttempts');
    await queryRunner.dropColumn('users', 'lastPasswordChangeAt');
    await queryRunner.dropColumn('users', 'lastLoginAt');
    await queryRunner.dropColumn('users', 'emailVerificationTokenExpiresAt');
    await queryRunner.dropColumn('users', 'emailVerificationToken');
    await queryRunner.dropColumn('users', 'emailVerified');
    await queryRunner.dropColumn('users', 'status');
    await queryRunner.dropColumn('users', 'passwordResetTokenExpiresAt');
    await queryRunner.dropColumn('users', 'passwordResetToken');
    await queryRunner.dropColumn('users', 'phoneNumber');
    // Note: DO NOT drop email, firstName, lastName as they're part of the initial schema

    // Drop ENUM type
    await queryRunner.query(`DROP TYPE IF EXISTS user_status`);
  }
}
