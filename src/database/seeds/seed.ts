/* eslint-disable no-console */
import AppDataSource from '../data-source';
import * as bcrypt from 'bcrypt';

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('🌱 Starting database seed...');

    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    // Upsert admin user (safe to re-run)
    await queryRunner.query(`
      INSERT INTO "users" (
        "id",
        "username",
        "email",
        "firstName",
        "lastName",
        "passwordHash",
        "role",
        "status",
        "emailVerified",
        "failedLoginAttempts",
        "lockedUntil",
        "lastPasswordChangeAt"
      )
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'admin',
        'admin@local.test',
        'System',
        'Administrator',
        $1,
        'admin',
        'active',
        true,
        0,
        NULL,
        NOW()
      )
      ON CONFLICT ("username") DO UPDATE
      SET
        "passwordHash" = EXCLUDED."passwordHash",
        "email" = EXCLUDED."email",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "role" = EXCLUDED."role",
        "status" = EXCLUDED."status",
        "emailVerified" = EXCLUDED."emailVerified",
        "failedLoginAttempts" = 0,
        "lockedUntil" = NULL,
        "lastPasswordChangeAt" = NOW(),
        "deletedAt" = NULL,
        "updatedAt" = NOW()
    `, [adminPasswordHash]);

    console.log('✅ User seeded:');
    console.log('   admin / admin123 (role: admin)');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

void seed();
