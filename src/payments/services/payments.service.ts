import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LoanPayment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../entities/loan-payment.entity';
import { InstallmentStatus } from '../../installments/entities/loan-installment.entity';
import { LoanInstallment } from '../../installments/entities/loan-installment.entity';
import { Loan, LoanStatus } from '../../loans/entities/loan.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CreateAdvancePaymentDto } from '../dto/create-advance-payment.dto';
import {
  AdvancePaymentAllocationDto,
  AdvancePaymentResultDto,
} from '../dto/advance-payment-result.dto';
import { CreatePrepaymentDto } from '../dto/create-prepayment.dto';
import { PrepaymentResultDto, PrepaymentInstallmentDto } from '../dto/prepayment-result.dto';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';
import {
  AmortizationEntry,
  LoanCalculationService,
} from '../../shared/services/loan-calculation.service';
import {
  InterestCalculationMethod,
  PrepaymentAction,
} from '../../shared/enums/interest-calculation.enum';

export class PaymentsQuery {
  page?: number;
  limit?: number;
  installmentId?: string;
  loanId?: string;
  clientId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(LoanPayment)
    private readonly paymentRepository: Repository<LoanPayment>,
    @InjectRepository(LoanInstallment)
    private readonly installmentRepository: Repository<LoanInstallment>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    private readonly loanCalculationService: LoanCalculationService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<LoanPayment> {
    const installment = await this.installmentRepository.findOne({
      where: { id: dto.installmentId },
      relations: ['loan', 'payments'],
    });

    if (!installment) {
      throw new NotFoundException(`Installment with ID ${dto.installmentId} not found`);
    }

    if (installment.status === InstallmentStatus.PAID) {
      throw new BadRequestException('Installment is already fully paid');
    }

    const remainingAmount = this.getOutstandingInstallmentAmount(installment);
    if (dto.amount > remainingAmount) {
      throw new BadRequestException(
        `Payment amount ${dto.amount} exceeds remaining balance ${remainingAmount.toFixed(2)}`,
      );
    }

    const payment = this.paymentRepository.create({
      installment,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      status: PaymentStatus.COMPLETED,
    });

    const saved = await this.paymentRepository.save(payment);

    await this.updateInstallmentStatus(installment, dto.amount);
    await this.syncLoanStatus(installment.loan.id);

    return saved;
  }

  async createAdvancePayment(dto: CreateAdvancePaymentDto): Promise<AdvancePaymentResultDto> {
    const loan = await this.loadLoanForAdvancePayment(dto.loanId);
    const allocatableInstallments = this.getAllocatableInstallments(loan.installments);
    const remainingLoanBalance = this.getRemainingLoanBalance(allocatableInstallments);

    this.validateAdvancePayment(dto.amount, remainingLoanBalance, allocatableInstallments.length);

    const allocations = await this.allocateAdvancePayment(dto, allocatableInstallments);

    return this.buildAdvancePaymentResult(dto, allocations);
  }

  async findAll(params: PaymentsQuery = {}): Promise<PaginatedResult<LoanPayment>> {
    const { page = 1, limit = 10, installmentId, loanId, clientId, status, paymentMethod } = params;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.installment', 'installment')
      .leftJoinAndSelect('installment.loan', 'loan')
      .leftJoinAndSelect('loan.client', 'client')
      .orderBy('payment.createdAt', 'DESC');

    if (installmentId) {
      qb.andWhere('installment.id = :installmentId', { installmentId });
    }
    if (loanId) {
      qb.andWhere('loan.id = :loanId', { loanId });
    }
    if (clientId) {
      qb.andWhere('client.id = :clientId', { clientId });
    }
    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }
    if (paymentMethod) {
      qb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<LoanPayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['installment', 'installment.loan', 'installment.loan.client'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async cancel(id: string, reason?: string): Promise<LoanPayment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be cancelled');
    }

    const updatedNotes = reason
      ? `${payment.notes ? payment.notes + '\n' : ''}Cancelled: ${reason}`.trim()
      : payment.notes;

    await this.paymentRepository.update(id, {
      status: PaymentStatus.CANCELLED,
      notes: updatedNotes,
    });

    return this.findOne(id);
  }

  private async updateInstallmentStatus(
    installment: LoanInstallment,
    paymentAmount: number,
  ): Promise<void> {
    const totalPaid = this.calculateCompletedPaidAmount(installment) + paymentAmount;
    const totalDue = Number(installment.totalAmount) + Number(installment.lateFee);

    await this.installmentRepository.update(installment.id, {
      status: totalPaid >= totalDue ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
    });
  }

  private async syncLoanStatus(loanId: string): Promise<void> {
    const unpaidInstallments = await this.installmentRepository.count({
      where: [
        { loan: { id: loanId }, status: InstallmentStatus.PENDING },
        { loan: { id: loanId }, status: InstallmentStatus.OVERDUE },
        { loan: { id: loanId }, status: InstallmentStatus.PARTIAL },
      ],
    });

    if (unpaidInstallments === 0) {
      await this.loanRepository.update(loanId, { status: LoanStatus.COMPLETED });
    }
  }

  private calculateCompletedPaidAmount(installment: LoanInstallment): number {
    if (!installment.payments || installment.payments.length === 0) {
      return 0;
    }

    return installment.payments.reduce((total, payment) => {
      if (payment.status !== PaymentStatus.COMPLETED) {
        return total;
      }

      return total + Number(payment.amount);
    }, 0);
  }

  private getOutstandingInstallmentAmount(installment: LoanInstallment): number {
    const totalDue = Number(installment.totalAmount) + Number(installment.lateFee);
    const totalPaid = this.calculateCompletedPaidAmount(installment);
    return Number(Math.max(totalDue - totalPaid, 0).toFixed(2));
  }

  private async loadLoanForAdvancePayment(loanId: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { id: loanId },
      relations: ['installments', 'installments.payments'],
    });

    if (!loan) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
    }

    return loan;
  }

  private getAllocatableInstallments(installments: LoanInstallment[]): LoanInstallment[] {
    return installments
      .filter(installment => installment.status !== InstallmentStatus.PAID)
      .sort((left, right) => {
        const dueDateComparison =
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
        if (dueDateComparison !== 0) {
          return dueDateComparison;
        }

        return left.installmentNumber - right.installmentNumber;
      });
  }

  private getRemainingLoanBalance(installments: LoanInstallment[]): number {
    return installments.reduce(
      (total, installment) => total + this.getOutstandingInstallmentAmount(installment),
      0,
    );
  }

  private validateAdvancePayment(
    amount: number,
    remainingLoanBalance: number,
    allocatableInstallmentsCount: number,
  ): void {
    if (allocatableInstallmentsCount === 0) {
      throw new BadRequestException(
        'Loan has no unpaid installments to receive an advance payment',
      );
    }

    if (amount > remainingLoanBalance) {
      throw new BadRequestException(
        `Advance payment amount ${amount} exceeds remaining loan balance ${remainingLoanBalance.toFixed(2)}`,
      );
    }
  }

  private async allocateAdvancePayment(
    dto: CreateAdvancePaymentDto,
    allocatableInstallments: LoanInstallment[],
  ): Promise<AdvancePaymentAllocationDto[]> {
    const allocations: AdvancePaymentAllocationDto[] = [];

    await this.paymentRepository.manager.transaction(async manager => {
      const paymentRepo = manager.getRepository(LoanPayment);
      const installmentRepo = manager.getRepository(LoanInstallment);
      const transactionalLoanRepo = manager.getRepository(Loan);

      let remainingAmount = dto.amount;

      for (const installment of allocatableInstallments) {
        remainingAmount = await this.allocateToSingleInstallment({
          dto,
          installment,
          remainingAmount,
          paymentRepo,
          installmentRepo,
          allocations,
        });

        if (remainingAmount <= 0) {
          break;
        }
      }

      await this.markLoanCompletedIfPaid(dto.loanId, installmentRepo, transactionalLoanRepo);
    });

    return allocations;
  }

  private async allocateToSingleInstallment({
    dto,
    installment,
    remainingAmount,
    paymentRepo,
    installmentRepo,
    allocations,
  }: {
    dto: CreateAdvancePaymentDto;
    installment: LoanInstallment;
    remainingAmount: number;
    paymentRepo: Repository<LoanPayment>;
    installmentRepo: Repository<LoanInstallment>;
    allocations: AdvancePaymentAllocationDto[];
  }): Promise<number> {
    const outstandingAmount = this.getOutstandingInstallmentAmount(installment);
    if (outstandingAmount <= 0 || remainingAmount <= 0) {
      return remainingAmount;
    }

    const allocatedAmount = Math.min(remainingAmount, outstandingAmount);
    const nextStatus =
      allocatedAmount >= outstandingAmount ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL;

    const payment = paymentRepo.create({
      installment,
      amount: allocatedAmount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      status: PaymentStatus.COMPLETED,
    });

    await paymentRepo.save(payment);
    await installmentRepo.update(installment.id, { status: nextStatus });

    allocations.push({
      installmentId: installment.id,
      installmentNumber: installment.installmentNumber,
      allocatedAmount: Number(allocatedAmount.toFixed(2)),
      installmentStatus: nextStatus,
      remainingInstallmentBalance: Number((outstandingAmount - allocatedAmount).toFixed(2)),
    });

    return remainingAmount - allocatedAmount;
  }

  private async markLoanCompletedIfPaid(
    loanId: string,
    installmentRepo: Repository<LoanInstallment>,
    loanRepo: Repository<Loan>,
  ): Promise<void> {
    const updatedInstallments = await installmentRepo.find({
      where: { loan: { id: loanId } },
    });

    const fullyPaidOff = updatedInstallments.every(
      installment => installment.status === InstallmentStatus.PAID,
    );

    if (fullyPaidOff) {
      await loanRepo.update(loanId, { status: LoanStatus.COMPLETED });
    }
  }

  private async buildAdvancePaymentResult(
    dto: CreateAdvancePaymentDto,
    allocations: AdvancePaymentAllocationDto[],
  ): Promise<AdvancePaymentResultDto> {
    const refreshedInstallments = await this.installmentRepository.find({
      where: { loan: { id: dto.loanId } },
      relations: ['payments'],
    });
    const remainingLoanBalance = this.getRemainingLoanBalance(
      refreshedInstallments.filter(installment => installment.status !== InstallmentStatus.PAID),
    );
    const allocatedAmount = allocations.reduce(
      (total, allocation) => total + allocation.allocatedAmount,
      0,
    );

    return {
      loanId: dto.loanId,
      requestedAmount: dto.amount,
      allocatedAmount: Number(allocatedAmount.toFixed(2)),
      remainingLoanBalance: Number(remainingLoanBalance.toFixed(2)),
      fullyPaidOff: remainingLoanBalance === 0,
      allocations,
    };
  }

  // ─── Prepayment (principal reduction + schedule restructure) ───────────────

  async createPrepayment(dto: CreatePrepaymentDto): Promise<PrepaymentResultDto> {
    const loan = await this.loadLoanForPrepayment(dto.loanId);
    const previousBalance = this.getActivePrincipalBalance(loan);
    this.validatePrepaymentAmount(dto.amount, previousBalance);
    const pending = this.extractPendingInstallments(loan.installments);
    if (pending.length === 0) {
      throw new BadRequestException('No pending installments to restructure after prepayment');
    }
    const action = this.resolvePrepaymentAction(dto, loan);
    const newBalance = Number((previousBalance - dto.amount).toFixed(2));
    const newSchedule = this.loanCalculationService.recalculateAfterPrepayment({
      newRemainingBalance: newBalance,
      annualRate: Number(loan.interestRate),
      remainingMonths: pending.length,
      startInstallmentNumber: pending[0].installmentNumber,
      nextDueDate: new Date(pending[0].dueDate),
      prepaymentAction: action,
      originalMonthlyPayment: Number(loan.monthlyPayment),
    });
    await this.persistPrepaymentTransaction(dto, loan, pending, newBalance, newSchedule);
    return this.assemblePrepaymentResult(
      dto,
      loan,
      previousBalance,
      newBalance,
      action,
      pending.length,
      newSchedule,
    );
  }

  private async loadLoanForPrepayment(loanId: string): Promise<Loan> {
    const loan = await this.loanRepository.findOne({
      where: { id: loanId },
      relations: ['installments'],
    });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found`);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException('Prepayment is only allowed on active loans');
    }
    const method = loan.interestCalculationMethod ?? InterestCalculationMethod.DECLINING_BALANCE;
    if (method === InterestCalculationMethod.FLAT_RATE) {
      throw new BadRequestException(
        'Principal prepayment is not applicable to flat-rate loans. Use advance payment instead.',
      );
    }
    return loan;
  }

  private getActivePrincipalBalance(loan: Loan): number {
    const paid = loan.installments
      .filter(i => i.status === InstallmentStatus.PAID)
      .sort((a, b) => b.installmentNumber - a.installmentNumber);
    return paid.length === 0 ? Number(loan.principal) : Number(paid[0].remainingBalance);
  }

  private validatePrepaymentAmount(amount: number, balance: number): void {
    if (amount > balance) {
      throw new BadRequestException(
        `Prepayment amount ${amount} exceeds outstanding balance ${balance.toFixed(2)}`,
      );
    }
  }

  private extractPendingInstallments(installments: LoanInstallment[]): LoanInstallment[] {
    return installments
      .filter(i => i.status !== InstallmentStatus.PAID)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }

  private resolvePrepaymentAction(dto: CreatePrepaymentDto, loan: Loan): PrepaymentAction {
    return dto.prepaymentAction ?? loan.prepaymentAction ?? PrepaymentAction.REDUCE_TERM;
  }

  private async persistPrepaymentTransaction(
    dto: CreatePrepaymentDto,
    loan: Loan,
    pending: LoanInstallment[],
    newBalance: number,
    newSchedule: AmortizationEntry[],
  ): Promise<void> {
    await this.paymentRepository.manager.transaction(async manager => {
      await this.savePrepaymentRecord(manager, dto, loan);
      await this.deletePendingInstallments(manager, pending);
      if (newBalance > 0) {
        await this.saveNewInstallmentSchedule(manager, loan, newSchedule);
      }
      if (newBalance <= 0) {
        await manager.getRepository(Loan).update(loan.id, { status: LoanStatus.COMPLETED });
      }
    });
  }

  private async savePrepaymentRecord(
    manager: import('typeorm').EntityManager,
    dto: CreatePrepaymentDto,
    loan: Loan,
  ): Promise<void> {
    const repo = manager.getRepository(LoanPayment);
    const payment = repo.create({
      loanId: loan.id,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      status: PaymentStatus.COMPLETED,
      paymentType: PaymentType.PREPAYMENT,
    });
    await repo.save(payment);
  }

  private async deletePendingInstallments(
    manager: import('typeorm').EntityManager,
    pending: LoanInstallment[],
  ): Promise<void> {
    const repo = manager.getRepository(LoanInstallment);
    const ids = pending.map(i => i.id);
    if (ids.length > 0) await repo.delete(ids);
  }

  private async saveNewInstallmentSchedule(
    manager: import('typeorm').EntityManager,
    loan: Loan,
    schedule: AmortizationEntry[],
  ): Promise<void> {
    const repo = manager.getRepository(LoanInstallment);
    const installments = schedule.map(entry =>
      repo.create({
        loan: { id: loan.id } as Loan,
        installmentNumber: entry.installmentNumber,
        principalAmount: entry.principalAmount,
        interestAmount: entry.interestAmount,
        totalAmount: entry.totalAmount,
        remainingBalance: entry.remainingBalance,
        dueDate: entry.dueDate,
        status: InstallmentStatus.PENDING,
      }),
    );
    await repo.save(installments);
  }

  private assemblePrepaymentResult(
    dto: CreatePrepaymentDto,
    loan: Loan,
    previousBalance: number,
    newBalance: number,
    action: PrepaymentAction,
    previousCount: number,
    newSchedule: AmortizationEntry[],
  ): PrepaymentResultDto {
    const mapped: PrepaymentInstallmentDto[] = newSchedule.map(e => ({
      installmentNumber: e.installmentNumber,
      dueDate:
        e.dueDate instanceof Date ? e.dueDate.toISOString().split('T')[0] : String(e.dueDate),
      principalAmount: e.principalAmount,
      interestAmount: e.interestAmount,
      totalAmount: e.totalAmount,
      remainingBalance: e.remainingBalance,
    }));
    return {
      loanId: loan.id,
      prepaidAmount: dto.amount,
      previousBalance,
      newRemainingBalance: newBalance,
      prepaymentAction: action,
      previousRemainingInstallments: previousCount,
      newRemainingInstallments: newSchedule.length,
      monthsSaved:
        action === PrepaymentAction.REDUCE_TERM ? previousCount - newSchedule.length : undefined,
      newMonthlyPayment:
        action === PrepaymentAction.REDUCE_INSTALLMENT && newSchedule.length > 0
          ? newSchedule[0].totalAmount
          : undefined,
      newSchedule: mapped,
    };
  }
}
