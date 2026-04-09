import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Loan,
  LoanStatus,
  LoanType,
  InterestCalculationMethod,
  PrepaymentAction,
} from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';
import {
  LoanCalculationDto,
  LoanCalculationResultDto,
  EarlyPayoffCalculationDto,
  EarlyPayoffResultDto,
} from './dto/loan-calculation.dto';
import { EarlySettlementPreviewDto, ProcessEarlySettlementDto } from './dto/early-settlement.dto';
import { LoanCalculationService } from '../shared/services/loan-calculation.service';
import { InterestRateService } from '../shared/services/interest-rate.service';
import { ClientsService } from '../clients/services/clients.service';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';
import { Client } from '../clients/entities/client.entity';
import {
  LoanInstallment,
  InstallmentStatus,
} from '../installments/entities/loan-installment.entity';
import {
  LoanPayment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../payments/entities/loan-payment.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(LoanInstallment)
    private readonly installmentRepository: Repository<LoanInstallment>,
    @InjectRepository(LoanPayment)
    private readonly paymentRepository: Repository<LoanPayment>,
    private readonly loanCalculationService: LoanCalculationService,
    private readonly interestRateService: InterestRateService,
    private readonly clientsService: ClientsService,
  ) {}

  /**
   * Create a new loan application with calculated values
   */
  // eslint-disable-next-line max-lines-per-function
  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    // Validate client exists and check eligibility
    const client = await this.clientsService.findOne(createLoanDto.clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${createLoanDto.clientId} not found`);
    }

    // Check client eligibility for new loan
    const eligibilityResult = await this.clientsService.checkLoanEligibility(
      createLoanDto.clientId,
    );
    if (!eligibilityResult.isEligible) {
      throw new BadRequestException(
        `Client is not eligible for a new loan: ${eligibilityResult.reason}`,
      );
    }

    // Get optimized interest rate based on client risk profile
    const optimizedRate = await this.calculateOptimizedInterestRate(createLoanDto, client);

    // Compute financial totals (dispatch based on calculation method)
    const method =
      createLoanDto.interestCalculationMethod ?? InterestCalculationMethod.DECLINING_BALANCE;
    const financials = this.computeLoanFinancials(
      createLoanDto.principal,
      optimizedRate,
      createLoanDto.termInMonths,
      method,
    );

    // Calculate end date
    const startDate = new Date(createLoanDto.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + createLoanDto.termInMonths);

    // Create loan with calculated values
    const loan = this.loanRepository.create({
      client,
      principal: createLoanDto.principal,
      interestRate: optimizedRate,
      termInMonths: createLoanDto.termInMonths,
      monthlyPayment: financials.monthlyPayment,
      totalInterest: financials.totalInterest,
      totalAmount: financials.totalAmount,
      loanType: createLoanDto.loanType,
      loanPurpose: createLoanDto.loanPurpose,
      startDate,
      endDate,
      riskAdjustment: createLoanDto.riskAdjustment,
      downPayment: createLoanDto.downPayment,
      loanOfficerId: createLoanDto.loanOfficerId,
      status: LoanStatus.PENDING,
      interestCalculationMethod: method,
      earlySettlementRebatePercentage: createLoanDto.earlySettlementRebatePercentage,
      prepaymentAction: createLoanDto.prepaymentAction ?? PrepaymentAction.REDUCE_TERM,
    });

    const savedLoan = await this.loanRepository.save(loan);

    // Generate installment schedule
    await this.generateInstallmentSchedule(savedLoan);

    return this.findOne(savedLoan.id);
  }

  /**
   * Find all loans with filtering and pagination
   */
  // eslint-disable-next-line max-lines-per-function, complexity
  async findAll(findLoansDto: FindLoansDto): Promise<PaginatedResult<Loan>> {
    const {
      page = 1,
      limit = 10,
      clientId,
      status,
      loanType,
      loanPurpose,
      startDateFrom,
      startDateTo,
      minAmount,
      maxAmount,
      loanOfficerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = findLoansDto;

    const queryBuilder = this.loanRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client')
      .leftJoinAndSelect('loan.installments', 'installments');

    // Apply filters
    if (clientId) {
      queryBuilder.andWhere('loan.client.id = :clientId', { clientId });
    }

    if (status) {
      queryBuilder.andWhere('loan.status = :status', { status });
    }

    if (loanType) {
      queryBuilder.andWhere('loan.loanType = :loanType', { loanType });
    }

    if (loanPurpose) {
      queryBuilder.andWhere('loan.loanPurpose = :loanPurpose', { loanPurpose });
    }

    if (startDateFrom) {
      queryBuilder.andWhere('loan.startDate >= :startDateFrom', { startDateFrom });
    }

    if (startDateTo) {
      queryBuilder.andWhere('loan.startDate <= :startDateTo', { startDateTo });
    }

    if (minAmount) {
      queryBuilder.andWhere('loan.principal >= :minAmount', { minAmount });
    }

    if (maxAmount) {
      queryBuilder.andWhere('loan.principal <= :maxAmount', { maxAmount });
    }

    if (loanOfficerId) {
      queryBuilder.andWhere('loan.loanOfficerId = :loanOfficerId', { loanOfficerId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(client.firstName ILIKE :search OR client.lastName ILIKE :search OR loan.notes ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`loan.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [loans, total] = await queryBuilder.getManyAndCount();

    return {
      data: loans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a specific loan by ID
   */
  async findOne(id: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { id },
      relations: ['client', 'installments'],
      order: {
        installments: { installmentNumber: 'ASC' },
      },
    });

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }

    return loan;
  }

  /**
   * Update an existing loan
   */
  async update(id: string, updateLoanDto: UpdateLoanDto): Promise<Loan> {
    const loan = await this.findOne(id);

    // Check if loan can be updated based on status
    if (loan.status === LoanStatus.COMPLETED || loan.status === LoanStatus.CLOSED) {
      throw new BadRequestException('Cannot update a completed or closed loan');
    }

    // If interest rate is being updated, recalculate loan metrics
    if (updateLoanDto.interestRate && updateLoanDto.interestRate !== loan.interestRate) {
      // If loan is active, we cannot change the interest rate
      if (loan.status === LoanStatus.ACTIVE) {
        throw new BadRequestException('Cannot change interest rate on an active loan');
      }
      // Note: In a real system, recalculate and persist updated loan metrics here
    }

    // Update loan
    await this.loanRepository.update(id, updateLoanDto);

    return this.findOne(id);
  }

  /**
   * Cancel a loan (soft delete)
   */
  async remove(id: string): Promise<void> {
    const loan = await this.findOne(id);

    if (loan.status === LoanStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active loan. Please close it first.');
    }

    await this.loanRepository.update(id, { status: LoanStatus.CANCELLED });
  }

  /**
   * Approve a loan application
   */
  async approveLoan(id: string, approverId: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.PENDING && loan.status !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Cannot approve loan with status ${loan.status}`);
    }

    // Set loan officer if not already set
    const updates: Partial<Loan> = {
      status: LoanStatus.APPROVED,
      loanOfficerId: loan.loanOfficerId || approverId,
    };

    await this.loanRepository.update(id, updates);

    return this.findOne(id);
  }

  /**
   * Reject a loan application
   */
  async rejectLoan(id: string, reason: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.PENDING && loan.status !== LoanStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Cannot reject loan with status ${loan.status}`);
    }

    await this.loanRepository.update(id, {
      status: LoanStatus.REJECTED,
      notes: loan.notes
        ? `${loan.notes}\n\nRejection reason: ${reason}`
        : `Rejection reason: ${reason}`,
    });

    return this.findOne(id);
  }

  /**
   * Activate an approved loan
   */
  async activateLoan(id: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException(`Cannot activate loan with status ${loan.status}`);
    }

    await this.loanRepository.update(id, { status: LoanStatus.ACTIVE });

    return this.findOne(id);
  }

  /**
   * Calculate loan metrics without creating a loan
   */
  // eslint-disable-next-line max-lines-per-function
  calculateLoanMetrics(calculationDto: LoanCalculationDto): LoanCalculationResultDto {
    const {
      principal,
      interestRate,
      termInMonths,
      interestCalculationMethod,
      loanType: _loanType,
      downPayment = 0,
      riskAdjustment = 0,
      extraPayment: _extraPayment = 0,
    } = calculationDto;

    // Apply risk adjustment
    const effectiveRate = interestRate + riskAdjustment;

    const method = interestCalculationMethod ?? InterestCalculationMethod.DECLINING_BALANCE;

    const financials = this.computeLoanFinancials(principal, effectiveRate, termInMonths, method);

    // Calculate loan-to-value ratio for secured loans
    const propertyValue = principal + downPayment;
    const loanToValueRatio = downPayment > 0 ? principal / propertyValue : undefined;

    // Generate amortization schedule
    const amortizationSchedule = this.loanCalculationService.generateSchedule(
      {
        principal,
        interestRate: effectiveRate,
        termInMonths,
        startDate: new Date(),
      },
      method,
    );

    // Calculate debt-to-income impact (simplified)
    const estimatedMonthlyIncome = 5000; // This would come from client data in real app
    const debtToIncomeImpact = financials.monthlyPayment / estimatedMonthlyIncome;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + termInMonths);

    return {
      monthlyPayment: financials.monthlyPayment,
      totalInterest: financials.totalInterest,
      totalAmount: financials.totalAmount,
      effectiveRate,
      loanToValueRatio,
      debtToIncomeImpact,
      amortizationSchedule: amortizationSchedule.map(entry => ({
        installmentNumber: entry.installmentNumber,
        principalAmount: entry.principalAmount,
        interestAmount: entry.interestAmount,
        totalAmount: entry.totalAmount,
        remainingBalance: entry.remainingBalance,
        dueDate: entry.dueDate.toISOString().split('T')[0],
      })),
      summary: {
        totalPayments: termInMonths,
        firstPaymentDate: startDate.toISOString().split('T')[0],
        lastPaymentDate: endDate.toISOString().split('T')[0],
        interestPercentage: (financials.totalInterest / principal) * 100,
      },
    };
  }

  /**
   * Calculate early payoff scenarios
   */
  async calculateEarlyPayoff(
    calculationDto: EarlyPayoffCalculationDto,
  ): Promise<EarlyPayoffResultDto> {
    const loan = await this.findOne(calculationDto.loanId);

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException('Early payoff calculation is only available for active loans');
    }

    const currentBalance = await this.getCurrentLoanBalance(loan.id);

    const earlyPayoffResult = this.loanCalculationService.calculateEarlyPayoff(
      currentBalance,
      loan.interestRate,
      loan.monthlyPayment,
      calculationDto.extraMonthlyPayment || 0,
      calculationDto.lumpSumPayment || 0,
      loan.endDate,
    );

    return earlyPayoffResult;
  }

  /**
   * Get current loan balance
   */
  async getCurrentLoanBalance(loanId: string): Promise<number> {
    const loan = await this.findOne(loanId);

    // Find the last paid installment
    const lastPaidInstallment = await this.installmentRepository
      .createQueryBuilder('installment')
      .where('installment.loanId = :loanId', { loanId })
      .andWhere('installment.status = :status', { status: InstallmentStatus.PAID })
      .orderBy('installment.installmentNumber', 'DESC')
      .getOne();

    if (!lastPaidInstallment) {
      return loan.principal; // No payments made yet
    }

    return lastPaidInstallment.remainingBalance;
  }

  /**
   * Get loan statistics for reporting
   */
  // eslint-disable-next-line max-lines-per-function
  async getLoanStatistics(loanOfficerId?: string): Promise<{
    totalLoans: number;
    totalPrincipal: number;
    averageLoanAmount: number;
    loansByStatus: Record<LoanStatus, number>;
    loansByType: Record<LoanType, number>;
    averageInterestRate: number;
    approvalRate: number;
  }> {
    const queryBuilder = this.loanRepository.createQueryBuilder('loan');

    if (loanOfficerId) {
      queryBuilder.where('loan.loanOfficerId = :loanOfficerId', { loanOfficerId });
    }

    const loans = await queryBuilder.getMany();

    const totalLoans = loans.length;
    const totalPrincipal = loans.reduce((sum, loan) => sum + Number(loan.principal), 0);
    const averageLoanAmount = totalLoans > 0 ? totalPrincipal / totalLoans : 0;

    // Count by status
    const loansByStatus = loans.reduce(
      (acc, loan) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
      },
      {} as Record<LoanStatus, number>,
    );

    // Count by type
    const loansByType = loans.reduce(
      (acc, loan) => {
        acc[loan.loanType] = (acc[loan.loanType] || 0) + 1;
        return acc;
      },
      {} as Record<LoanType, number>,
    );

    // Calculate average interest rate
    const averageInterestRate =
      totalLoans > 0
        ? loans.reduce((sum, loan) => sum + Number(loan.interestRate), 0) / totalLoans
        : 0;

    // Calculate approval rate
    const approvedCount =
      (loansByStatus[LoanStatus.APPROVED] || 0) +
      (loansByStatus[LoanStatus.ACTIVE] || 0) +
      (loansByStatus[LoanStatus.COMPLETED] || 0);
    const processedCount =
      totalLoans -
      (loansByStatus[LoanStatus.PENDING] || 0) -
      (loansByStatus[LoanStatus.UNDER_REVIEW] || 0);
    const approvalRate = processedCount > 0 ? (approvedCount / processedCount) * 100 : 0;

    return {
      totalLoans,
      totalPrincipal,
      averageLoanAmount,
      loansByStatus,
      loansByType,
      averageInterestRate,
      approvalRate,
    };
  }

  /**
   * Generate installment schedule for a loan (dispatches by calculation method).
   */
  private async generateInstallmentSchedule(loan: Loan): Promise<void> {
    const method = loan.interestCalculationMethod ?? InterestCalculationMethod.DECLINING_BALANCE;
    const schedule = this.loanCalculationService.generateSchedule(
      {
        principal: loan.principal,
        interestRate: loan.interestRate,
        termInMonths: loan.termInMonths,
        startDate: new Date(loan.startDate),
      },
      method,
    );

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
      }),
    );

    await this.installmentRepository.save(installments);
  }

  /**
   * Compute monthly payment, total interest and total amount based on
   * the configured calculation method — without persisting anything.
   */
  private computeLoanFinancials(
    principal: number,
    interestRate: number,
    termInMonths: number,
    method: InterestCalculationMethod,
  ): { monthlyPayment: number; totalInterest: number; totalAmount: number } {
    if (method === InterestCalculationMethod.FLAT_RATE) {
      return this.loanCalculationService.calculateFlatRateMetrics(
        principal,
        interestRate,
        termInMonths,
      );
    }
    const monthlyPayment = this.loanCalculationService.calculateMonthlyPayment(
      principal,
      interestRate,
      termInMonths,
    );
    const totalInterest = this.loanCalculationService.calculateTotalInterest(
      principal,
      monthlyPayment,
      termInMonths,
    );
    return { monthlyPayment, totalInterest, totalAmount: principal + totalInterest };
  }

  // ─── Early Settlement ──────────────────────────────────────────────────────

  /**
   * Preview the settlement amount due if the borrower pays off the loan today.
   * For FLAT_RATE loans: forgives a fraction of remaining scheduled interest.
   * For DECLINING_BALANCE loans: settlement = outstanding principal (no rebate).
   */
  async previewEarlySettlement(loanId: string): Promise<EarlySettlementPreviewDto> {
    const loan = await this.loadLoanForSettlement(loanId);
    const paidCount = loan.installments.filter(i => i.status === InstallmentStatus.PAID).length;
    return this.buildSettlementPreview(loan, paidCount);
  }

  private async loadLoanForSettlement(loanId: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { id: loanId },
      relations: ['installments'],
    });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found`);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException('Early settlement is only available for active loans');
    }
    return loan;
  }

  private buildSettlementPreview(loan: Loan, paidInstallments: number): EarlySettlementPreviewDto {
    const method = loan.interestCalculationMethod ?? InterestCalculationMethod.DECLINING_BALANCE;
    const rebatePercentage = Number(loan.earlySettlementRebatePercentage ?? 0);

    if (method === InterestCalculationMethod.FLAT_RATE) {
      return this.buildFlatRatePreview(loan, paidInstallments, rebatePercentage);
    }
    return this.buildDecliningBalancePreview(loan, paidInstallments);
  }

  private buildFlatRatePreview(
    loan: Loan,
    paidInstallments: number,
    rebatePercentage: number,
  ): EarlySettlementPreviewDto {
    const settlement = this.loanCalculationService.calculateFlatRateEarlySettlement({
      principal: Number(loan.principal),
      annualRate: Number(loan.interestRate),
      termInMonths: loan.termInMonths,
      paidInstallments,
      rebatePercentage,
    });
    return {
      loanId: loan.id,
      interestCalculationMethod: InterestCalculationMethod.FLAT_RATE,
      paidInstallments,
      remainingInstallments: settlement.remainingInstallments,
      remainingPrincipal: settlement.remainingPrincipal,
      scheduledRemainingInterest: settlement.scheduledRemainingInterest,
      rebatePercentage,
      rebateAmount: settlement.rebateAmount,
      settlementAmount: settlement.settlementAmount,
      previewDate: new Date().toISOString().split('T')[0],
    };
  }

  private buildDecliningBalancePreview(
    loan: Loan,
    paidInstallments: number,
  ): EarlySettlementPreviewDto {
    const remainingInstallments = loan.termInMonths - paidInstallments;
    const lastPaid = loan.installments
      .filter(i => i.status === InstallmentStatus.PAID)
      .sort((a, b) => b.installmentNumber - a.installmentNumber)
      .at(0);
    const remainingPrincipal = lastPaid
      ? Number(lastPaid.remainingBalance)
      : Number(loan.principal);

    return {
      loanId: loan.id,
      interestCalculationMethod: InterestCalculationMethod.DECLINING_BALANCE,
      paidInstallments,
      remainingInstallments,
      remainingPrincipal,
      scheduledRemainingInterest: 0,
      rebatePercentage: 0,
      rebateAmount: 0,
      settlementAmount: remainingPrincipal,
      previewDate: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Execute early settlement: records a SETTLEMENT payment, marks all
   * remaining installments as PAID and closes the loan.
   */
  async settleEarly(
    loanId: string,
    dto: ProcessEarlySettlementDto,
  ): Promise<EarlySettlementPreviewDto> {
    const loan = await this.loadLoanForSettlement(loanId);
    const paidCount = loan.installments.filter(i => i.status === InstallmentStatus.PAID).length;
    const preview = this.buildSettlementPreview(loan, paidCount);

    await this.paymentRepository.manager.transaction(async manager => {
      await this.persistSettlementPayment(manager, loan, dto, preview.settlementAmount);
      await this.markRemainingInstallmentsPaid(manager, loan.installments);
      await manager.getRepository(Loan).update(loan.id, { status: LoanStatus.COMPLETED });
    });

    return { ...preview, previewDate: new Date().toISOString().split('T')[0] };
  }

  private async persistSettlementPayment(
    manager: import('typeorm').EntityManager,
    loan: Loan,
    dto: ProcessEarlySettlementDto,
    amount: number,
  ): Promise<void> {
    const paymentRepo = manager.getRepository(LoanPayment);
    const payment = paymentRepo.create({
      loanId: loan.id,
      amount,
      paymentMethod: dto.paymentMethod as PaymentMethod,
      paymentDate: new Date(dto.paymentDate),
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      status: PaymentStatus.COMPLETED,
      paymentType: PaymentType.SETTLEMENT,
    });
    await paymentRepo.save(payment);
  }

  private async markRemainingInstallmentsPaid(
    manager: import('typeorm').EntityManager,
    installments: LoanInstallment[],
  ): Promise<void> {
    const repo = manager.getRepository(LoanInstallment);
    const unpaid = installments.filter(i => i.status !== InstallmentStatus.PAID);
    for (const inst of unpaid) {
      await repo.update(inst.id, { status: InstallmentStatus.PAID });
    }
  }

  /**
   * Calculate optimized interest rate based on client data and loan details
   */
  private async calculateOptimizedInterestRate(
    createLoanDto: CreateLoanDto,
    client: Client,
  ): Promise<number> {
    const hasExplicitRate =
      createLoanDto.interestRate !== undefined && createLoanDto.interestRate !== null;

    // When the caller provides an explicit rate, keep that value as the base.
    // Automatic risk pricing is only applied when the system selects the base rate.
    const baseRate = hasExplicitRate
      ? createLoanDto.interestRate
      : await this.interestRateService.getCurrentRate(createLoanDto.loanType);

    // Apply any manual risk adjustment
    const manualAdjustment = createLoanDto.riskAdjustment || 0;
    if (hasExplicitRate) {
      return baseRate + manualAdjustment;
    }

    // Calculate risk adjustment based on client profile
    const riskProfile = {
      creditScore: client.creditScore ?? 700,
      debtToIncomeRatio: 0.3, // This would be calculated from client data
      employmentYears: 5, // This would come from client data
      monthlyIncome: 5000, // This would come from client data
    };

    const riskAdjustmentData = this.interestRateService.calculateRiskAdjustment(riskProfile);

    return baseRate + riskAdjustmentData.riskAdjustment + manualAdjustment;
  }
}
