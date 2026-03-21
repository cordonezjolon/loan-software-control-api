import AppDataSource from '../data-source';
import * as bcrypt from 'bcrypt';

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('🌱 Starting database seed...');

    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const officerPasswordHash = await bcrypt.hash('officer123', 10);
    const employeePasswordHash = await bcrypt.hash('employee123', 10);

    // Upsert users (safe to re-run)
    await queryRunner.query(`
      INSERT INTO "users" ("id", "username", "passwordHash", "role")
      VALUES
        ('550e8400-e29b-41d4-a716-446655440000', 'admin',     $1, 'admin'),
        ('550e8400-e29b-41d4-a716-446655440001', 'officer1',  $2, 'loan_officer'),
        ('550e8400-e29b-41d4-a716-446655440002', 'employee1', $3, 'employee')
      ON CONFLICT ("id") DO NOTHING
    `, [adminPasswordHash, officerPasswordHash, employeePasswordHash]);

    console.log('✅ Users seeded:');
    console.log('   admin     / admin123   (role: admin)');
    console.log('   officer1  / officer123 (role: loan_officer)');
    console.log('   employee1 / employee123 (role: employee)');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

void seed();
