# Loan Management API - Agent Specifications

## Agent: NestJS Loan Management System Expert

### Description
A specialized agent for developing a comprehensive loan management API using NestJS, TypeScript, and PostgreSQL. This agent enforces SOLID principles, clean code practices, and implements robust authentication and data validation systems.

### Expertise Areas
- **NestJS Framework**: Advanced module architecture, dependency injection, guards, interceptors
- **TypeORM**: Entity relationships, migrations, repositories, query optimization
- **PostgreSQL**: Database design, indexing, performance optimization
- **Authentication & Security**: JWT tokens, password hashing, role-based access control
- **Code Quality**: ESLint, Prettier, Husky hooks, automated testing
- **Clean Architecture**: SOLID principles, separation of concerns, domain-driven design

### Core Responsibilities

#### 1. Project Architecture & Setup
- Initialize NestJS project with proper TypeScript configuration
- Set up modular architecture following clean architecture principles
- Configure TypeORM with PostgreSQL connection and migrations
- Implement comprehensive error handling and logging
- Set up development tools (ESLint, Prettier, Husky)

#### 2. Database Schema Design
```typescript
// Core entities to implement:
// - User (authentication and authorization)
// - Client (loan applicants/borrowers)
// - LoanConfiguration (interest rates, calculation settings)
// - Loan (main loan records with calculated payments)
// - LoanInstallment (monthly payment schedules)
// - LoanPayment (actual payments made)
// - LoanStatus (loan lifecycle management)
// - InterestRateHistory (tracking rate changes over time)
```

#### 3. Authentication & Security
- Implement JWT-based authentication system
- Password hashing using bcrypt
- Role-based access control (RBAC)
- API rate limiting and request validation
- Security headers and CORS configuration

#### 4. Business Logic Implementation
- **Client Management**: CRUD operations, validation, search
- **Loan Configuration**: Interest rate management, calculation rule setup
- **Loan Processing**: Application, approval workflow, payment calculation engines
- **Payment Calculation**: Monthly payment computation based on principal, rate, and term
- **Installment Management**: Automated payment scheduling, overdue tracking, interest accrual
- **Interest Rate Management**: Dynamic rate configuration, historical tracking
- **Reporting**: Payment schedules, amortization tables, financial summaries, analytics

### Implementation Guidelines

#### SOLID Principles Application

**Single Responsibility Principle (SRP)**
```typescript
// ✅ Each service has one responsibility
@Injectable()
export class LoanCalculationService {
  calculateMonthlyPayment(principal: number, annualRate: number, termInMonths: number): number {
    const monthlyRate = annualRate / 12;
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
    const denominator = Math.pow(1 + monthlyRate, termInMonths) - 1;
    return numerator / denominator;
  }

  calculateTotalInterest(principal: number, monthlyPayment: number, termInMonths: number): number {
    return (monthlyPayment * termInMonths) - principal;
  }

  generateAmortizationSchedule(loan: Loan): LoanInstallment[] {
    // Generate detailed payment schedule
  }
}

@Injectable()
export class InterestRateService {
  getCurrentRate(loanType: LoanType): Promise<number> {
    // Retrieve current interest rates
  }

  updateInterestRate(loanType: LoanType, newRate: number): Promise<void> {
    // Update and track rate changes
  }
}

@Injectable()
export class LoanNotificationService {
  sendOverdueNotification(loan: Loan): Promise<void> {
    // Only handles notifications
  }
}
```

**Open/Closed Principle (OCP)**
```typescript
// ✅ Extensible through inheritance and interfaces
interface PaymentProcessor {
  processPayment(payment: PaymentDto): Promise<PaymentResult>;
}

@Injectable()
export class CreditCardProcessor implements PaymentProcessor {
  async processPayment(payment: PaymentDto): Promise<PaymentResult> {
    // Credit card specific implementation
  }
}

@Injectable()
export class BankTransferProcessor implements PaymentProcessor {
  async processPayment(payment: PaymentDto): Promise<PaymentResult> {
    // Bank transfer specific implementation
  }
}
```

**Liskov Substitution Principle (LSP)**
```typescript
// ✅ Derived classes can replace base classes
abstract class LoanValidator {
  abstract validate(loan: CreateLoanDto): ValidationResult;
}

export class PersonalLoanValidator extends LoanValidator {
  validate(loan: CreateLoanDto): ValidationResult {
    // Personal loan specific validation
  }
}

export class BusinessLoanValidator extends LoanValidator {
  validate(loan: CreateLoanDto): ValidationResult {
    // Business loan specific validation
  }
}
```

**Interface Segregation Principle (ISP)**
```typescript
// ✅ Specific interfaces for different needs
interface LoanReader {
  findById(id: string): Promise<Loan>;
  findByClient(clientId: string): Promise<Loan[]>;
}

interface LoanWriter {
  create(loan: CreateLoanDto): Promise<Loan>;
  update(id: string, loan: UpdateLoanDto): Promise<Loan>;
}

interface LoanDeleter {
  delete(id: string): Promise<void>;
}
```

**Dependency Inversion Principle (DIP)**
```typescript
// ✅ Depend on abstractions, not concretions
@Injectable()
export class LoanService {
  constructor(
    private readonly loanRepository: Repository<Loan>,
    private readonly calculator: LoanCalculationService,
    private readonly notifier: LoanNotificationService,
  ) {}
  
  async approveLoan(loanId: string): Promise<Loan> {
    // High-level policy depends on abstractions
  }
}
```

#### Clean Code Practices

**Meaningful Names**
```typescript
// ✅ Clear, descriptive names
export class LoanApplicationService {
  async submitApplication(application: LoanApplicationDto): Promise<LoanApplication> {
    const validationResult = await this.validateApplication(application);
    if (!validationResult.isValid) {
      throw new BadRequestException(validationResult.errors);
    }
    return this.createLoanApplication(application);
  }
}
```

**Small Functions**
```typescript
// ✅ Functions do one thing well
async calculateTotalInterest(loan: Loan): Promise<number> {
  const interestRate = await this.getInterestRate(loan.type);
  const principal = loan.principal;
  const termInMonths = loan.termInMonths;
  
  return this.compoundInterestCalculation(principal, interestRate, termInMonths);
}

private compoundInterestCalculation(principal: number, rate: number, term: number): number {
  const monthlyRate = rate / 12;
  const monthlyPayment = this.calculateMonthlyPayment(principal, rate, term);
  return (monthlyPayment * term) - principal;
}

async generatePaymentSchedule(loanId: string): Promise<LoanInstallment[]> {
  const loan = await this.findLoanById(loanId);
  const monthlyPayment = this.calculateMonthlyPayment(
    loan.principal, 
    loan.interestRate, 
    loan.termInMonths
  );
  
  return this.createInstallmentSchedule(loan, monthlyPayment);
}
```

**Error Handling**
```typescript
// ✅ Comprehensive error handling
@Catch(TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: TypeORMError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    logger.error('Database error:', exception);
    
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        timestamp: new Date().toISOString(),
      });
  }
}
```

### Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── guards/             # Auth guards
│   ├── strategies/         # JWT/Local strategies
│   └── decorators/         # Custom decorators
├── clients/                # Client management module
│   ├── entities/          # Client entities
│   ├── dto/               # Data transfer objects
│   ├── services/          # Business logic
│   ├── controllers/       # API endpoints
│   └── repositories/      # Data access layer
├── loans/                  # Loan management module
│   ├── entities/          # Loan entities
│   ├── dto/               # Data transfer objects
│   ├── services/          # Business logic
│   ├── controllers/       # API endpoints
│   └── repositories/      # Data access layer
├── installments/           # Installment management module
├── payments/               # Payment processing module
├── notifications/          # Notification system
├── shared/                 # Shared utilities
│   ├── guards/            # Common guards
│   ├── interceptors/      # Common interceptors
│   ├── pipes/             # Validation pipes
│   ├── filters/           # Exception filters
│   └── utils/             # Helper utilities
├── config/                 # Configuration files
└── database/              # Database related files
    ├── migrations/        # TypeORM migrations
    └── seeds/             # Database seeders
```

### Development Tools Configuration

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "complexity": ["error", 10],
    "max-lines-per-function": ["error", 50]
  }
}
```

#### Husky Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:unit",
      "pre-push": "npm run test:e2e && npm run build"
    }
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### API Design Principles

#### RESTful Design
```typescript
@Controller('api/v1/loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  @Get()
  @ApiOperation({ summary: 'Get all loans with pagination' })
  async findAll(@Query() query: FindLoansDto): Promise<PaginatedResult<Loan>> {}
  
  @Get(':id')
  @ApiOperation({ summary: 'Get loan by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Loan> {}
  
  @Post()
  @ApiOperation({ summary: 'Create new loan application' })
  async create(@Body() createLoanDto: CreateLoanDto): Promise<Loan> {}
  
  @Patch(':id')
  @ApiOperation({ summary: 'Update loan details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLoanDto: UpdateLoanDto,
  ): Promise<Loan> {}
  
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/delete loan' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {}
  
  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get loan amortization schedule' })
  async getAmortizationSchedule(@Param('id', ParseUUIDPipe) id: string): Promise<LoanInstallment[]> {}
  
  @Get(':id/remaining-balance')
  @ApiOperation({ summary: 'Get current remaining balance' })
  async getRemainingBalance(@Param('id', ParseUUIDPipe) id: string): Promise<{ remainingBalance: number }> {}
}

@Controller('api/v1/loan-calculations')
@UseGuards(JwtAuthGuard)
export class LoanCalculationsController {
  @Post('calculate')
  @ApiOperation({ summary: 'Calculate loan payment details' })
  async calculateLoan(@Body() calculation: LoanCalculationDto): Promise<LoanCalculationResultDto> {
    const monthlyPayment = this.calculationService.calculateMonthlyPayment(
      calculation.principal,
      calculation.interestRate,
      calculation.termInMonths
    );
    
    const totalInterest = this.calculationService.calculateTotalInterest(
      calculation.principal,
      monthlyPayment,
      calculation.termInMonths
    );
    
    const amortizationSchedule = this.calculationService.generateAmortizationSchedule({
      ...calculation,
      startDate: new Date(),
    });
    
    return {
      monthlyPayment,
      totalInterest,
      totalAmount: calculation.principal + totalInterest,
      amortizationSchedule,
    };
  }
  
  @Get('interest-rates')
  @ApiOperation({ summary: 'Get current interest rates by loan type' })
  async getInterestRates(): Promise<Record<LoanType, number>> {
    return this.interestRateService.getAllCurrentRates();
  }
  
  @Post('estimate-rate')
  @ApiOperation({ summary: 'Estimate interest rate based on client risk profile' })
  async estimateRate(
    @Body() riskProfile: RiskProfileDto,
    @Query('loanType') loanType: LoanType,
  ): Promise<{ estimatedRate: number; breakdown: RateBreakdown }> {
    return this.interestRateService.estimateRateWithBreakdown(loanType, riskProfile);
  }
}

@Controller('api/v1/loan-configurations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
export class LoanConfigurationsController {
  @Get()
  @ApiOperation({ summary: 'Get all loan configurations' })
  async findAll(): Promise<LoanConfiguration[]> {}
  
  @Post()
  @ApiOperation({ summary: 'Create new loan configuration' })
  async create(@Body() config: CreateLoanConfigurationDto): Promise<LoanConfiguration> {}
  
  @Patch(':id')
  @ApiOperation({ summary: 'Update loan configuration' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() config: UpdateLoanConfigurationDto,
  ): Promise<LoanConfiguration> {}
  
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate loan configuration' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<LoanConfiguration> {}
  
  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate loan configuration' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<LoanConfiguration> {}
}
```

#### Data Validation
```typescript
export class CreateLoanDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ description: 'Client ID' })
  clientId: string;
  
  @IsNumber()
  @Min(1000)
  @Max(1000000)
  @ApiProperty({ description: 'Loan amount', minimum: 1000, maximum: 1000000 })
  principal: number;
  
  @IsNumber()
  @Min(0.01)
  @Max(0.50)
  @ApiProperty({ description: 'Annual interest rate as decimal', minimum: 0.01, maximum: 0.50 })
  interestRate: number;
  
  @IsInt()
  @Min(6)
  @Max(360)
  @ApiProperty({ description: 'Loan term in months', minimum: 6, maximum: 360 })
  termInMonths: number;
  
  @IsEnum(LoanType)
  @ApiProperty({ enum: LoanType })
  loanType: LoanType;
  
  @IsDateString()
  @ApiProperty({ description: 'Loan start date' })
  startDate: string;
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.10)
  @ApiProperty({ description: 'Risk adjustment factor', required: false })
  riskAdjustment?: number;
}

export class LoanCalculationDto {
  @IsNumber()
  @Min(1000)
  @ApiProperty({ description: 'Loan principal amount' })
  principal: number;
  
  @IsNumber()
  @Min(0.01)
  @ApiProperty({ description: 'Annual interest rate as decimal' })
  interestRate: number;
  
  @IsInt()
  @Min(6)
  @ApiProperty({ description: 'Loan term in months' })
  termInMonths: number;
}

export class LoanCalculationResultDto {
  @ApiProperty({ description: 'Monthly payment amount' })
  monthlyPayment: number;
  
  @ApiProperty({ description: 'Total interest over loan term' })
  totalInterest: number;
  
  @ApiProperty({ description: 'Total amount to be paid' })
  totalAmount: number;
  
  @ApiProperty({ description: 'Amortization schedule', type: [Object] })
  amortizationSchedule: Array<{
    installmentNumber: number;
    principalAmount: number;
    interestAmount: number;
    totalAmount: number;
    remainingBalance: number;
    dueDate: Date;
  }>;
}
```

### Loan Calculation System

#### Core Calculation Features

**Monthly Payment Calculation**
```typescript
// Fixed-rate loan payment formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
// Where: P = Principal, r = Monthly interest rate, n = Number of payments

@Injectable()
export class LoanCalculationService {
  calculateMonthlyPayment(principal: number, annualRate: number, termInMonths: number): number {
    const monthlyRate = annualRate / 12;
    const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
    const denominator = Math.pow(1 + monthlyRate, termInMonths) - 1;
    
    return Math.round((numerator / denominator) * 100) / 100;
  }

  calculateTotalInterest(principal: number, monthlyPayment: number, termInMonths: number): number {
    return (monthlyPayment * termInMonths) - principal;
  }

  generateAmortizationSchedule(loan: CreateLoanDto & { startDate: Date }): AmortizationEntry[] {
    const monthlyPayment = this.calculateMonthlyPayment(
      loan.principal, 
      loan.interestRate, 
      loan.termInMonths
    );
    
    const schedule: AmortizationEntry[] = [];
    let remainingBalance = loan.principal;
    const monthlyRate = loan.interestRate / 12;
    
    for (let i = 1; i <= loan.termInMonths; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      schedule.push({
        installmentNumber: i,
        principalAmount: Math.round(principalPayment * 100) / 100,
        interestAmount: Math.round(interestPayment * 100) / 100,
        totalAmount: monthlyPayment,
        remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
        dueDate: dueDate,
      });
    }
    
    return schedule;
  }
}

interface AmortizationEntry {
  installmentNumber: number;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
  dueDate: Date;
}
```

**Interest Rate Management**
```typescript
@Injectable()
export class InterestRateService {
  async getCurrentRate(loanType: LoanType, clientRiskProfile?: RiskProfile): Promise<number> {
    const baseRate = await this.getBaseRate(loanType);
    const riskAdjustment = clientRiskProfile ? 
      await this.calculateRiskAdjustment(clientRiskProfile) : 0;
    
    return baseRate + riskAdjustment;
  }

  async calculateRiskAdjustment(clientProfile: RiskProfile): Promise<number> {
    // Risk-based pricing logic
    const creditScore = clientProfile.creditScore;
    const debtToIncomeRatio = clientProfile.debtToIncomeRatio;
    const employmentHistory = clientProfile.employmentYears;
    
    let adjustment = 0;
    
    // Credit score impact
    if (creditScore < 600) adjustment += 0.02;
    else if (creditScore < 700) adjustment += 0.01;
    
    // Debt-to-income ratio impact
    if (debtToIncomeRatio > 0.4) adjustment += 0.015;
    else if (debtToIncomeRatio > 0.3) adjustment += 0.005;
    
    // Employment history impact
    if (employmentHistory < 2) adjustment += 0.01;
    
    return Math.min(adjustment, 0.05); // Cap at 5% additional
  }
}

enum LoanType {
  PERSONAL = 'personal',
  AUTO = 'auto',
  MORTGAGE = 'mortgage',
  BUSINESS = 'business',
}

interface RiskProfile {
  creditScore: number;
  debtToIncomeRatio: number;
  employmentYears: number;
  monthlyIncome: number;
}
```

**Loan Configuration Management**
```typescript
@Injectable()
export class LoanConfigurationService {
  async createLoanWithCalculations(createLoanDto: CreateLoanDto): Promise<Loan> {
    // Calculate all loan metrics
    const monthlyPayment = this.calculationService.calculateMonthlyPayment(
      createLoanDto.principal,
      createLoanDto.interestRate,
      createLoanDto.termInMonths
    );
    
    const totalInterest = this.calculationService.calculateTotalInterest(
      createLoanDto.principal,
      monthlyPayment,
      createLoanDto.termInMonths
    );
    
    const totalAmount = createLoanDto.principal + totalInterest;
    const endDate = this.calculateEndDate(createLoanDto.startDate, createLoanDto.termInMonths);
    
    // Create loan with calculated values
    const loan = this.loanRepository.create({
      ...createLoanDto,
      monthlyPayment,
      totalInterest,
      totalAmount,
      endDate,
      status: LoanStatus.PENDING,
    });
    
    const savedLoan = await this.loanRepository.save(loan);
    
    // Generate installment schedule
    await this.generateInstallmentSchedule(savedLoan);
    
    return savedLoan;
  }

  private calculateEndDate(startDate: string, termInMonths: number): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + termInMonths);
    return endDate;
  }

  private async generateInstallmentSchedule(loan: Loan): Promise<void> {
    const schedule = this.calculationService.generateAmortizationSchedule({
      principal: loan.principal,
      interestRate: loan.interestRate,
      termInMonths: loan.termInMonths,
      startDate: new Date(loan.startDate),
    });
    
    const installments = schedule.map(entry => 
      this.installmentRepository.create({
        loan,
        installmentNumber: entry.installmentNumber,
        principalAmount: entry.principalAmount,
        interestAmount: entry.interestAmount,
        totalAmount: entry.totalAmount,
        remainingBalance: entry.remainingBalance,
        dueDate: entry.dueDate,
        status: InstallmentStatus.PENDING,
      })
    );
    
    await this.installmentRepository.save(installments);
  }
}
```

### Database Design

#### Entity Relationships
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ unique: true })
  username: string;
  
  @Column()
  passwordHash: string;
  
  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  firstName: string;
  
  @Column()
  lastName: string;
  
  @Column({ unique: true })
  email: string;
  
  @Column({ unique: true })
  phoneNumber: string;
  
  @Column({ type: 'jsonb' })
  address: Address;
  
  @OneToMany(() => Loan, loan => loan.client)
  loans: Loan[];
}

@Entity('loan_configurations')
export class LoanConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ type: 'enum', enum: LoanType })
  loanType: LoanType;
  
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  baseInterestRate: number;
  
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  riskAdjustment: number;
  
  @Column({ default: true })
  isActive: boolean;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => Client, client => client.loans)
  @JoinColumn({ name: 'clientId' })
  client: Client;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  principal: number;
  
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  interestRate: number;
  
  @Column()
  termInMonths: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPayment: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalInterest: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;
  
  @Column({ type: 'enum', enum: LoanType })
  loanType: LoanType;
  
  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.PENDING })
  status: LoanStatus;
  
  @Column({ type: 'date' })
  startDate: Date;
  
  @Column({ type: 'date' })
  endDate: Date;
  
  @OneToMany(() => LoanInstallment, installment => installment.loan, { cascade: true })
  installments: LoanInstallment[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('loan_installments')
export class LoanInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ManyToOne(() => Loan, loan => loan.installments)
  @JoinColumn({ name: 'loanId' })
  loan: Loan;
  
  @Column()
  installmentNumber: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  principalAmount: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  interestAmount: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;
  
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  remainingBalance: number;
  
  @Column({ type: 'date' })
  dueDate: Date;
  
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFee: number;
  
  @Column({ type: 'enum', enum: InstallmentStatus, default: InstallmentStatus.PENDING })
  status: InstallmentStatus;
  
  @OneToMany(() => LoanPayment, payment => payment.installment)
  payments: LoanPayment[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Testing Strategy

#### Unit Tests
```typescript
describe('LoanCalculationService', () => {
  let service: LoanCalculationService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoanCalculationService],
    }).compile();
    
    service = module.get<LoanCalculationService>(LoanCalculationService);
  });
  
  describe('calculateMonthlyPayment', () => {
    it('should calculate correct monthly payment for fixed rate loan', () => {
      const principal = 100000;
      const annualRate = 0.05;
      const termInMonths = 360;
      
      const result = service.calculateMonthlyPayment(principal, annualRate, termInMonths);
      
      expect(result).toBeCloseTo(536.82, 2);
    });
    
    it('should calculate monthly payment for shorter term loan', () => {
      const principal = 50000;
      const annualRate = 0.08;
      const termInMonths = 60;
      
      const result = service.calculateMonthlyPayment(principal, annualRate, termInMonths);
      
      expect(result).toBeCloseTo(1013.82, 2);
    });
  });
  
  describe('calculateTotalInterest', () => {
    it('should calculate total interest over loan term', () => {
      const principal = 100000;
      const monthlyPayment = 536.82;
      const termInMonths = 360;
      
      const result = service.calculateTotalInterest(principal, monthlyPayment, termInMonths);
      
      expect(result).toBeCloseTo(93255.20, 2);
    });
  });
  
  describe('generateAmortizationSchedule', () => {
    it('should generate correct amortization schedule', () => {
      const loan = {
        principal: 10000,
        interestRate: 0.06,
        termInMonths: 12,
      } as Loan;
      
      const schedule = service.generateAmortizationSchedule(loan);
      
      expect(schedule).toHaveLength(12);
      expect(schedule[0].principalAmount).toBeLessThan(schedule[11].principalAmount);
      expect(schedule[0].interestAmount).toBeGreaterThan(schedule[11].interestAmount);
    });
  });
});
```

#### Integration Tests
```typescript
describe('LoansController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });
  
  describe('/loans (POST)', () => {
    it('should create a new loan', () => {
      return request(app.getHttpServer())
        .post('/api/v1/loans')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validLoanDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.principal).toBe(validLoanDto.principal);
        });
    });
  });
});
```

### Performance Considerations

- **Database Indexing**: Strategic indexes on frequently queried columns
- **Pagination**: Implement cursor-based pagination for large datasets
- **Caching**: Redis for session management and frequent queries
- **Connection Pooling**: Optimized database connection management
- **Query Optimization**: Use TypeORM query builder for complex queries

### Security Measures

- **Input Validation**: Comprehensive DTO validation using class-validator
- **SQL Injection Prevention**: TypeORM parameterized queries
- **Authentication**: JWT with refresh token mechanism
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: API endpoint protection
- **Data Encryption**: Sensitive data encryption at rest
- **Audit Logging**: Comprehensive action logging for compliance

### Deployment & DevOps

- **Docker**: Containerized application deployment
- **Environment Configuration**: Separate configs for development, staging, production
- **Health Checks**: Application and database health endpoints
- **Monitoring**: Application performance monitoring (APM)
- **CI/CD**: Automated testing, building, and deployment pipeline

This agent specification ensures the development of a robust, scalable, and maintainable loan management system following industry best practices and clean code principles.

---

## Commit and Push Policy

**Do NOT run `git commit` or `git push` (or any variant) unless the user explicitly requests it.**

- Implement changes, run builds/tests/lint, and report status — but hold all git operations until the user says so (e.g. "commit this", "push now", "commit and push").
- When the user asks for a commit, use a concise single-line `-m` message. Never use multi-line `-m` flags.
- Never force-push or run destructive git commands without explicit confirmation.
