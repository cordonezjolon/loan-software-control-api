import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';

export class SeedInitialData1701234567891 implements MigrationInterface {
    name = 'SeedInitialData1701234567891'

    // eslint-disable-next-line max-lines-per-function
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Hash password for default users
        const saltRounds = 10;
        const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
        const employeePasswordHash = await bcrypt.hash('employee123', saltRounds);
        
        // Seed default users
        await queryRunner.query(`
            INSERT INTO "users" (
                "id", "username", "email", "passwordHash", "firstName", "lastName", "role", "isActive"
            ) VALUES
            (
                '550e8400-e29b-41d4-a716-446655440000',
                'admin',
                'admin@loanmanagement.com',
                $1,
                'System',
                'Administrator',
                'admin',
                true
            ),
            (
                '550e8400-e29b-41d4-a716-446655440001',
                'employee1',
                'john.doe@loanmanagement.com',
                $2,
                'John',
                'Doe',
                'employee',
                true
            )
        `, [adminPasswordHash, employeePasswordHash]);

        // Seed loan configurations
        await queryRunner.query(`
            INSERT INTO "loan_configurations" (
                "id", "loanType", "name", "description", "baseInterestRate", 
                "minPrincipal", "maxPrincipal", "minTermMonths", "maxTermMonths",
                "processingFee", "latePaymentFee", "riskAdjustmentMin", "riskAdjustmentMax", "isActive"
            ) VALUES
            (
                '660e8400-e29b-41d4-a716-446655440000',
                'personal',
                'Personal Loan Standard',
                'Standard personal loan for individual borrowers',
                0.08,
                1000.00,
                50000.00,
                12,
                60,
                100.00,
                25.00,
                0.00,
                0.05,
                true
            ),
            (
                '660e8400-e29b-41d4-a716-446655440001',
                'auto',
                'Auto Loan Standard',
                'Standard auto loan for vehicle purchases',
                0.06,
                5000.00,
                75000.00,
                24,
                84,
                150.00,
                30.00,
                0.00,
                0.03,
                true
            ),
            (
                '660e8400-e29b-41d4-a716-446655440002',
                'mortgage',
                'Home Mortgage Standard',
                'Standard mortgage loan for home purchases',
                0.045,
                50000.00,
                1000000.00,
                120,
                360,
                500.00,
                50.00,
                0.00,
                0.02,
                true
            ),
            (
                '660e8400-e29b-41d4-a716-446655440003',
                'business',
                'Business Loan Standard',
                'Standard business loan for commercial purposes',
                0.10,
                10000.00,
                500000.00,
                12,
                120,
                250.00,
                40.00,
                0.00,
                0.06,
                true
            )
        `);

        // Seed sample clients
        await queryRunner.query(`
            INSERT INTO "clients" (
                "id", "firstName", "lastName", "email", "phoneNumber", "address",
                "dateOfBirth", "nationalId", "creditScore", "employmentYears",
                "monthlyIncome", "debtToIncomeRatio", "notes", "isActive"
            ) VALUES
            (
                '770e8400-e29b-41d4-a716-446655440000',
                'Alice',
                'Johnson',
                'alice.johnson@email.com',
                '+1-555-0001',
                '{"street": "123 Main St", "city": "Anytown", "state": "CA", "zipCode": "90210", "country": "USA"}',
                '1985-03-15',
                'SSN123456789',
                750,
                5.5,
                6500.00,
                0.25,
                'Excellent credit history, stable employment',
                true
            ),
            (
                '770e8400-e29b-41d4-a716-446655440001',
                'Bob',
                'Smith',
                'bob.smith@email.com',
                '+1-555-0002',
                '{"street": "456 Oak Ave", "city": "Springfield", "state": "IL", "zipCode": "62701", "country": "USA"}',
                '1978-11-22',
                'SSN987654321',
                680,
                3.0,
                4200.00,
                0.35,
                'Good credit, recently changed jobs',
                true
            ),
            (
                '770e8400-e29b-41d4-a716-446655440002',
                'Carol',
                'Williams',
                'carol.williams@email.com',
                '+1-555-0003',
                '{"street": "789 Pine Rd", "city": "Columbus", "state": "OH", "zipCode": "43215", "country": "USA"}',
                '1990-07-08',
                'SSN456789123',
                720,
                2.5,
                5800.00,
                0.20,
                'Young professional, growing income',
                true
            )
        `);

        // Seed sample loans
        await queryRunner.query(`
            INSERT INTO "loans" (
                "id", "clientId", "configurationId", "principal", "interestRate", "termInMonths",
                "monthlyPayment", "totalInterest", "totalAmount", "loanType", "status",
                "startDate", "endDate", "approvedBy", "approvedAt", "notes"
            ) VALUES
            (
                '880e8400-e29b-41d4-a716-446655440000',
                '770e8400-e29b-41d4-a716-446655440000',
                '660e8400-e29b-41d4-a716-446655440001',
                25000.00,
                0.06,
                60,
                483.32,
                3999.20,
                28999.20,
                'auto',
                'active',
                '2024-01-01',
                '2029-01-01',
                '550e8400-e29b-41d4-a716-446655440000',
                '2024-01-01 10:00:00',
                'Approved for vehicle purchase - Toyota Camry 2024'
            ),
            (
                '880e8400-e29b-41d4-a716-446655440001',
                '770e8400-e29b-41d4-a716-446655440001',
                '660e8400-e29b-41d4-a716-446655440000',
                15000.00,
                0.10,
                36,
                484.01,
                2424.36,
                17424.36,
                'personal',
                'active',
                '2024-02-01',
                '2027-02-01',
                '550e8400-e29b-41d4-a716-446655440001',
                '2024-02-01 14:30:00',
                'Personal loan for home renovation'
            )
        `);

        // Seed sample loan installments for the first loan (first 6 months)
        await queryRunner.query(`
            INSERT INTO "loan_installments" (
                "id", "loanId", "installmentNumber", "principalAmount", "interestAmount",
                "totalAmount", "remainingBalance", "dueDate", "status"
            ) VALUES
            (
                '990e8400-e29b-41d4-a716-446655440000',
                '880e8400-e29b-41d4-a716-446655440000',
                1,
                358.32,
                125.00,
                483.32,
                24641.68,
                '2024-02-01',
                'paid'
            ),
            (
                '990e8400-e29b-41d4-a716-446655440001',
                '880e8400-e29b-41d4-a716-446655440000',
                2,
                360.11,
                123.21,
                483.32,
                24281.57,
                '2024-03-01',
                'paid'
            ),
            (
                '990e8400-e29b-41d4-a716-446655440002',
                '880e8400-e29b-41d4-a716-446655440000',
                3,
                362.01,
                121.31,
                483.32,
                23919.56,
                '2024-04-01',
                'paid'
            ),
            (
                '990e8400-e29b-41d4-a716-446655440003',
                '880e8400-e29b-41d4-a716-446655440000',
                4,
                363.83,
                119.49,
                483.32,
                23555.73,
                '2024-05-01',
                'pending'
            ),
            (
                '990e8400-e29b-41d4-a716-446655440004',
                '880e8400-e29b-41d4-a716-446655440000',
                5,
                365.66,
                117.66,
                483.32,
                23190.07,
                '2024-06-01',
                'pending'
            ),
            (
                '990e8400-e29b-41d4-a716-446655440005',
                '880e8400-e29b-41d4-a716-446655440000',
                6,
                367.51,
                115.81,
                483.32,
                22822.56,
                '2024-07-01',
                'pending'
            )
        `);

        // Seed sample payments
        await queryRunner.query(`
            INSERT INTO "loan_payments" (
                "id", "instalmentId", "amount", "paymentMethod", "transactionReference",
                "paidBy", "status", "processedAt"
            ) VALUES
            (
                'aa0e8400-e29b-41d4-a716-446655440000',
                '990e8400-e29b-41d4-a716-446655440000',
                483.32,
                'bank_transfer',
                'TXN-2024-02-01-001',
                'Alice Johnson',
                'processed',
                '2024-02-01 09:15:00'
            ),
            (
                'aa0e8400-e29b-41d4-a716-446655440001',
                '990e8400-e29b-41d4-a716-446655440001',
                483.32,
                'online_payment',
                'TXN-2024-03-01-001',
                'Alice Johnson',
                'processed',
                '2024-03-01 10:30:00'
            ),
            (
                'aa0e8400-e29b-41d4-a716-446655440002',
                '990e8400-e29b-41d4-a716-446655440002',
                483.32,
                'bank_transfer',
                'TXN-2024-04-01-001',
                'Alice Johnson',
                'processed',
                '2024-04-01 08:45:00'
            )
        `);

        // Seed sample notifications
        await queryRunner.query(`
            INSERT INTO "notifications" (
                "id", "recipientId", "type", "category", "priority", "subject", "message",
                "status", "sentAt", "deliveredAt", "metadata"
            ) VALUES
            (
                'bb0e8400-e29b-41d4-a716-446655440000',
                '770e8400-e29b-41d4-a716-446655440000',
                'email',
                'payment_reminder',
                'high',
                'Payment Reminder - Due Tomorrow',
                'Your payment of $483.32 is due tomorrow (May 1, 2024). Please ensure timely payment.',
                'delivered',
                '2024-04-30 09:00:00',
                '2024-04-30 09:02:00',
                '{"loanId": "880e8400-e29b-41d4-a716-446655440000", "installmentId": "990e8400-e29b-41d4-a716-446655440003"}'
            ),
            (
                'bb0e8400-e29b-41d4-a716-446655440001',
                '770e8400-e29b-41d4-a716-446655440001',
                'email',
                'loan_approval',
                'high',
                'Loan Approved!',
                'Congratulations! Your personal loan application has been approved for $15,000.',
                'read',
                '2024-02-01 14:30:00',
                '2024-02-01 14:32:00',
                '{"loanId": "880e8400-e29b-41d4-a716-446655440001"}'
            )
        `);

        // Update notification read timestamp for the second notification
        await queryRunner.query(`
            UPDATE "notifications" 
            SET "readAt" = '2024-02-01 15:00:00' 
            WHERE "id" = 'bb0e8400-e29b-41d4-a716-446655440001'
        `);

        // Seed interest rate history
        await queryRunner.query(`
            INSERT INTO "interest_rate_history" (
                "id", "loanType", "oldRate", "newRate", "effectiveDate", "reason", "changedBy"
            ) VALUES
            (
                'cc0e8400-e29b-41d4-a716-446655440000',
                'personal',
                0.085,
                0.08,
                '2024-01-01 00:00:00',
                'Market rate adjustment - Federal Reserve rate decrease',
                '550e8400-e29b-41d4-a716-446655440000'
            ),
            (
                'cc0e8400-e29b-41d4-a716-446655440001',
                'mortgage',
                0.05,
                0.045,
                '2024-01-15 00:00:00',
                'Competitive rate adjustment for Q1 2024',
                '550e8400-e29b-41d4-a716-446655440000'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Delete all seeded data in reverse order of dependencies
        await queryRunner.query(`DELETE FROM "interest_rate_history"`);
        await queryRunner.query(`DELETE FROM "notifications"`);
        await queryRunner.query(`DELETE FROM "loan_payments"`);
        await queryRunner.query(`DELETE FROM "loan_installments"`);
        await queryRunner.query(`DELETE FROM "loans"`);
        await queryRunner.query(`DELETE FROM "loan_configurations"`);
        await queryRunner.query(`DELETE FROM "clients"`);
        await queryRunner.query(`DELETE FROM "users"`);
    }
}