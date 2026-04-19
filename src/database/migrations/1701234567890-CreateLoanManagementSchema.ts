import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLoanManagementSchema1701234567890 implements MigrationInterface {
    name = 'CreateLoanManagementSchema1701234567890'

    // eslint-disable-next-line max-lines-per-function
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM types first
        await queryRunner.query(`
            CREATE TYPE "loan_type" AS ENUM('personal', 'auto', 'mortgage', 'business')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "loan_status" AS ENUM('pending', 'approved', 'active', 'paid_off', 'defaulted', 'cancelled')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "installment_status" AS ENUM('pending', 'paid', 'overdue', 'partial_payment')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "payment_status" AS ENUM('pending', 'processed', 'failed', 'refunded')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "payment_method" AS ENUM('cash', 'check', 'debit_card', 'credit_card', 'bank_transfer', 'online_payment')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "user_role" AS ENUM('admin', 'employee', 'manager')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "notification_type" AS ENUM('email', 'sms', 'push_notification', 'in_app')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "notification_category" AS ENUM('payment_reminder', 'overdue_notice', 'loan_approval', 'loan_rejection', 'payment_confirmation', 'interest_rate_change', 'system_announcement')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "notification_priority" AS ENUM('low', 'medium', 'high', 'urgent')
        `);
        
        await queryRunner.query(`
            CREATE TYPE "notification_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed')
        `);

        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "username" varchar(50) UNIQUE NOT NULL,
                "email" varchar(255) UNIQUE NOT NULL,
                "passwordHash" varchar(255) NOT NULL,
                "firstName" varchar(50) NOT NULL,
                "lastName" varchar(50) NOT NULL,
                "role" "user_role" NOT NULL DEFAULT 'employee',
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create clients table
        await queryRunner.query(`
            CREATE TABLE "clients" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "firstName" varchar(50) NOT NULL,
                "lastName" varchar(50) NOT NULL,
                "email" varchar(255) UNIQUE NOT NULL,
                "phoneNumber" varchar(20) UNIQUE NOT NULL,
                "address" jsonb NOT NULL,
                "dateOfBirth" date,
                "nationalId" varchar(50) UNIQUE,
                "creditScore" integer CHECK ("creditScore" >= 300 AND "creditScore" <= 850),
                "employmentYears" decimal(3,1) CHECK ("employmentYears" >= 0),
                "monthlyIncome" decimal(10,2),
                "debtToIncomeRatio" decimal(3,2) CHECK ("debtToIncomeRatio" >= 0 AND "debtToIncomeRatio" <= 1),
                "notes" text,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create loan_configurations table
        await queryRunner.query(`
            CREATE TABLE "loan_configurations" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "loanType" "loan_type" NOT NULL,
                "name" varchar(100) NOT NULL,
                "description" text,
                "baseInterestRate" decimal(5,4) NOT NULL CHECK ("baseInterestRate" >= 0 AND "baseInterestRate" <= 1),
                "minPrincipal" decimal(10,2) NOT NULL CHECK ("minPrincipal" > 0),
                "maxPrincipal" decimal(10,2) NOT NULL CHECK ("maxPrincipal" > "minPrincipal"),
                "minTermMonths" integer NOT NULL CHECK ("minTermMonths" > 0),
                "maxTermMonths" integer NOT NULL CHECK ("maxTermMonths" >= "minTermMonths"),
                "processingFee" decimal(8,2) DEFAULT 0,
                "latePaymentFee" decimal(8,2) DEFAULT 0,
                "riskAdjustmentMin" decimal(5,4) DEFAULT 0,
                "riskAdjustmentMax" decimal(5,4) DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create loans table
        await queryRunner.query(`
            CREATE TABLE "loans" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "clientId" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
                "configurationId" uuid REFERENCES "loan_configurations"("id"),
                "principal" decimal(10,2) NOT NULL CHECK ("principal" > 0),
                "interestRate" decimal(5,4) NOT NULL CHECK ("interestRate" >= 0 AND "interestRate" <= 1),
                "termInMonths" integer NOT NULL CHECK ("termInMonths" > 0),
                "monthlyPayment" decimal(10,2) NOT NULL,
                "totalInterest" decimal(10,2) NOT NULL,
                "totalAmount" decimal(10,2) NOT NULL,
                "loanType" "loan_type" NOT NULL,
                "status" "loan_status" NOT NULL DEFAULT 'pending',
                "startDate" date NOT NULL,
                "endDate" date NOT NULL,
                "approvedBy" uuid REFERENCES "users"("id"),
                "approvedAt" TIMESTAMP,
                "notes" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create loan_installments table
        await queryRunner.query(`
            CREATE TABLE "loan_installments" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "loanId" uuid NOT NULL REFERENCES "loans"("id") ON DELETE CASCADE,
                "installmentNumber" integer NOT NULL CHECK ("installmentNumber" > 0),
                "principalAmount" decimal(10,2) NOT NULL,
                "interestAmount" decimal(10,2) NOT NULL,
                "totalAmount" decimal(10,2) NOT NULL,
                "remainingBalance" decimal(10,2) NOT NULL CHECK ("remainingBalance" >= 0),
                "dueDate" date NOT NULL,
                "paidDate" TIMESTAMP,
                "lateFee" decimal(10,2) NOT NULL DEFAULT 0,
                "status" "installment_status" NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create loan_payments table
        await queryRunner.query(`
            CREATE TABLE "loan_payments" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "instalmentId" uuid NOT NULL REFERENCES "loan_installments"("id") ON DELETE CASCADE,
                "amount" decimal(10,2) NOT NULL CHECK ("amount" > 0),
                "paymentMethod" "payment_method" NOT NULL,
                "transactionReference" varchar(100),
                "paidBy" varchar(100),
                "status" "payment_status" NOT NULL DEFAULT 'pending',
                "processedAt" TIMESTAMP,
                "failureReason" text,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create interest_rate_history table
        await queryRunner.query(`
            CREATE TABLE "interest_rate_history" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "loanType" "loan_type" NOT NULL,
                "oldRate" decimal(5,4),
                "newRate" decimal(5,4) NOT NULL,
                "effectiveDate" TIMESTAMP NOT NULL,
                "reason" text,
                "changedBy" uuid REFERENCES "users"("id"),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create notifications table
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "recipientId" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
                "type" "notification_type" NOT NULL,
                "category" "notification_category" NOT NULL,
                "priority" "notification_priority" NOT NULL DEFAULT 'medium',
                "subject" varchar(255) NOT NULL,
                "message" text NOT NULL,
                "status" "notification_status" NOT NULL DEFAULT 'pending',
                "retryCount" integer NOT NULL DEFAULT 0,
                "maxRetries" integer NOT NULL DEFAULT 3,
                "sentAt" TIMESTAMP,
                "deliveredAt" TIMESTAMP,
                "readAt" TIMESTAMP,
                "errorMessage" text,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_clients_email" ON "clients" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_clients_phone" ON "clients" ("phoneNumber")`);
        await queryRunner.query(`CREATE INDEX "IDX_loans_client_id" ON "loans" ("clientId")`);
        await queryRunner.query(`CREATE INDEX "IDX_loans_status" ON "loans" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_loans_start_date" ON "loans" ("startDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_installments_loan_id" ON "loan_installments" ("loanId")`);
        await queryRunner.query(`CREATE INDEX "IDX_installments_due_date" ON "loan_installments" ("dueDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_installments_status" ON "loan_installments" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_instalment_id" ON "loan_payments" ("instalmentId")`);
        await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "loan_payments" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_id" ON "notifications" ("recipientId")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_status" ON "notifications" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_read_at" ON "notifications" ("readAt")`);

        // Add composite indexes
        await queryRunner.query(`CREATE INDEX "IDX_installments_loan_due_date" ON "loan_installments" ("loanId", "dueDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_status" ON "notifications" ("recipientId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_type_category" ON "notifications" ("type", "category")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order to handle foreign key constraints
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "interest_rate_history"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "loan_payments"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "loan_installments"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "loans"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "loan_configurations"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

        // Drop enum types
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_priority"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_category"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_type"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "payment_method"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "payment_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "installment_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "loan_status"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "loan_type"`);
    }
}