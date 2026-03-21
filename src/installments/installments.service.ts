import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoanInstallment, InstallmentStatus } from './entities/loan-installment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoanPayment } from '../payments/entities/loan-payment.entity';
import { FindInstallmentsDto } from './dto/find-installments.dto';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';

@Injectable()
export class InstallmentsService {
  private readonly logger = new Logger(InstallmentsService.name);

  constructor(
    @InjectRepository(LoanInstallment)
    private readonly installmentRepository: Repository<LoanInstallment>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
  ) {}

  /**
   * Find all installments with filtering and pagination
   */
  // eslint-disable-next-line max-lines-per-function
  async findAll(findInstallmentsDto: FindInstallmentsDto): Promise<PaginatedResult<LoanInstallment>> {
    const {
      page = 1,
      limit = 10,
      loanId,
      clientId,
      status,
      dueDateFrom,
      dueDateTo,
      overdueDaysMin,
      overdueOnly,
      sortBy = 'dueDate',
      sortOrder = 'ASC',
    } = findInstallmentsDto;

    const queryBuilder = this.installmentRepository
      .createQueryBuilder('installment')
      .leftJoinAndSelect('installment.loan', 'loan')
      .leftJoinAndSelect('loan.client', 'client')
      .leftJoinAndSelect('installment.payments', 'payments');

    // Apply filters
    if (loanId) {
      queryBuilder.andWhere('installment.loan.id = :loanId', { loanId });
    }

    if (clientId) {
      queryBuilder.andWhere('loan.client.id = :clientId', { clientId });
    }

    if (status) {
      queryBuilder.andWhere('installment.status = :status', { status });
    }

    if (dueDateFrom) {
      queryBuilder.andWhere('installment.dueDate >= :dueDateFrom', { dueDateFrom });
    }

    if (dueDateTo) {
      queryBuilder.andWhere('installment.dueDate <= :dueDateTo', { dueDateTo });
    }

    if (overdueOnly) {
      const today = new Date();
      queryBuilder.andWhere('installment.dueDate < :today', { today });
      queryBuilder.andWhere('installment.status IN (:...overdueStatuses)', {
        overdueStatuses: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE]
      });
    }

    if (overdueDaysMin !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - overdueDaysMin);
      queryBuilder.andWhere('installment.dueDate <= :cutoffDate', { cutoffDate });
    }

    // Apply sorting
    queryBuilder.orderBy(`installment.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [installments, total] = await queryBuilder.getManyAndCount();

    return {
      data: installments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a specific installment by ID
   */
  async findOne(id: string): Promise<LoanInstallment> {
    const installment = await this.installmentRepository.findOne({
      where: { id },
      relations: ['loan', 'loan.client', 'payments'],
    });

    if (!installment) {
      throw new NotFoundException(`Installment with ID ${id} not found`);
    }

    return installment;
  }

  /**
   * Get installments for a specific loan
   */
  async findByLoanId(loanId: string): Promise<LoanInstallment[]> {
    return this.installmentRepository.find({
      where: { loan: { id: loanId } },
      relations: ['payments'],
      order: { installmentNumber: 'ASC' },
    });
  }

  /**
   * Get overdue installments
   */
  async findOverdueInstallments(): Promise<LoanInstallment[]> {
    const today = new Date();
    return this.installmentRepository.find({
      where: {
        dueDate: LessThanOrEqual(today),
        status: InstallmentStatus.PENDING,
      },
      relations: ['loan', 'loan.client'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get upcoming installments (due within specified days)
   */
  async findUpcomingInstallments(daysAhead: number = 7): Promise<LoanInstallment[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return this.installmentRepository.find({
      where: {
        dueDate: Between(today, futureDate),
        status: InstallmentStatus.PENDING,
      },
      relations: ['loan', 'loan.client'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Mark installment as paid (should be called by PaymentService)
   */
  async markAsPaid(installmentId: string, paymentAmount: number): Promise<LoanInstallment> {
    const installment = await this.findOne(installmentId);

    if (installment.status === InstallmentStatus.PAID) {
      throw new BadRequestException('Installment is already marked as paid');
    }

    // Check if payment covers the full amount
    const totalPaid = this.calculateTotalPaidAmount(installment) + paymentAmount;
    const totalDue = Number(installment.totalAmount) + Number(installment.lateFee);

    let newStatus: InstallmentStatus;
    if (totalPaid >= totalDue) {
      newStatus = InstallmentStatus.PAID;
    } else {
      newStatus = InstallmentStatus.PARTIAL;
    }

    await this.installmentRepository.update(installmentId, { status: newStatus });

    return this.findOne(installmentId);
  }

  /**
   * Apply late fees to overdue installments
   */
  async applyLateFees(installmentId: string, lateFeeAmount: number): Promise<LoanInstallment> {
    const installment = await this.findOne(installmentId);

    if (installment.status === InstallmentStatus.PAID) {
      throw new BadRequestException('Cannot apply late fees to paid installments');
    }

    const currentLateFee = Number(installment.lateFee);
    const newLateFee = currentLateFee + lateFeeAmount;

    await this.installmentRepository.update(installmentId, {
      lateFee: newLateFee,
      status: InstallmentStatus.OVERDUE,
    });

    return this.findOne(installmentId);
  }

  /**
   * Get installment statistics for reporting
   */
  // eslint-disable-next-line max-lines-per-function
  async getInstallmentStatistics(loanId?: string): Promise<{
    totalInstallments: number;
    paidInstallments: number;
    overdueInstallments: number;
    pendingAmount: number;
    overdueAmount: number;
    totalLateFees: number;
    nextDueDate?: string;
    averageDaysOverdue: number;
  }> {
    const queryBuilder = this.installmentRepository.createQueryBuilder('installment');

    if (loanId) {
      queryBuilder.where('installment.loanId = :loanId', { loanId });
    }

    const installments = await queryBuilder.getMany();

    const stats = {
      totalInstallments: installments.length,
      paidInstallments: 0,
      overdueInstallments: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      totalLateFees: 0,
      nextDueDate: undefined as string | undefined,
      averageDaysOverdue: 0,
    };

    let totalOverdueDays = 0;
    let overdueCount = 0;
    const today = new Date();
    let nextDue: Date | null = null;

    for (const installment of installments) {
      const amount = Number(installment.totalAmount);
      const lateFee = Number(installment.lateFee);
      // dueDate may come back as a string from PostgreSQL 'date' columns
      const dueDate = new Date(installment.dueDate);

      stats.totalLateFees += lateFee;

      if (installment.status === InstallmentStatus.PAID) {
        stats.paidInstallments++;
      } else {
        stats.pendingAmount += amount + lateFee;

        if (dueDate < today) {
          stats.overdueInstallments++;
          stats.overdueAmount += amount + lateFee;

          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          totalOverdueDays += daysOverdue;
          overdueCount++;
        } else {
          // Find next due date
          // eslint-disable-next-line max-depth
          if (!nextDue || dueDate < nextDue) {
            nextDue = dueDate;
          }
        }
      }
    }

    if (nextDue) {
      stats.nextDueDate = nextDue.toISOString().split('T')[0];
    }

    if (overdueCount > 0) {
      stats.averageDaysOverdue = Math.round(totalOverdueDays / overdueCount);
    }

    return stats;
  }

  /**
   * Reschedule installments (for loan modifications)
   */
  async rescheduleInstallments(
    loanId: string,
    newSchedule: Array<{
      installmentNumber: number;
      totalAmount: number;
      dueDate: Date;
    }>
  ): Promise<LoanInstallment[]> {
    const loan = await this.loanRepository.findOne({ where: { id: loanId } });
    
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
    }

    if (loan.status === LoanStatus.COMPLETED || loan.status === LoanStatus.CLOSED) {
      throw new BadRequestException('Cannot reschedule installments for completed or closed loans');
    }

    // Get existing unpaid installments
    const existingInstallments = await this.installmentRepository.find({
      where: { 
        loan: { id: loanId },
        status: InstallmentStatus.PENDING
      },
    });

    // Update existing installments
    for (const newScheduleItem of newSchedule) {
      const existing = existingInstallments.find(
        i => i.installmentNumber === newScheduleItem.installmentNumber
      );

      if (existing) {
        await this.installmentRepository.update(existing.id, {
          totalAmount: newScheduleItem.totalAmount,
          dueDate: newScheduleItem.dueDate,
        });
      }
    }

    return this.findByLoanId(loanId);
  }

  /**
   * Calculate remaining balance from installments
   */
  async calculateRemainingBalance(loanId: string): Promise<number> {
    const installments = await this.findByLoanId(loanId);
    
    const unpaidInstallments = installments.filter(
      i => i.status !== InstallmentStatus.PAID
    );

    return unpaidInstallments.reduce((total, installment) => {
      return total + Number(installment.totalAmount) + Number(installment.lateFee);
    }, 0);
  }

  /**
   * Automated job to mark overdue installments
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueInstallments(): Promise<void> {
    const overdueInstallments = await this.findOverdueInstallments();
    
    for (const installment of overdueInstallments) {
      await this.installmentRepository.update(installment.id, {
        status: InstallmentStatus.OVERDUE,
      });
    }

    this.logger.log(`Marked ${overdueInstallments.length} installments as overdue`);
  }

  /**
   * Apply automated late fees
   * Runs daily at 1 AM
   */
  @Cron('0 1 * * *')
  async applyAutomatedLateFees(): Promise<void> {
    const overdueInstallments = await this.installmentRepository.find({
      where: { status: InstallmentStatus.OVERDUE },
      relations: ['loan'],
    });

    for (const installment of overdueInstallments) {
      const daysOverdue = Math.floor(
        (new Date().getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Apply late fee every 30 days (configurable business rule)
      if (daysOverdue > 0 && daysOverdue % 30 === 0) {
        const lateFeePercentage = 0.05; // 5% late fee (configurable)
        const lateFeeAmount = Number(installment.totalAmount) * lateFeePercentage;

        await this.applyLateFees(installment.id, lateFeeAmount);
      }
    }

    this.logger.log(`Processed late fees for overdue installments`);
  }

  /**
   * Helper method to calculate total paid amount for an installment
   */
  private calculateTotalPaidAmount(installment: LoanInstallment): number {
    if (!installment.payments || installment.payments.length === 0) {
      return 0;
    }

    return installment.payments.reduce((total, payment) => {
      return total + Number(payment.amount);
    }, 0);
  }

  /**
   * Get payment history for an installment
   */
  async getPaymentHistory(installmentId: string): Promise<LoanPayment[]> {
    const installment = await this.installmentRepository.findOne({
      where: { id: installmentId },
      relations: ['payments'],
    });

    if (!installment) {
      throw new NotFoundException(`Installment with ID ${installmentId} not found`);
    }

    return installment.payments || [];
  }

  /**
   * Check if loan can be closed (all installments paid)
   */
  async canCloseLoan(loanId: string): Promise<boolean> {
    const unpaidCount = await this.installmentRepository.count({
      where: {
        loan: { id: loanId },
        status: InstallmentStatus.PENDING || InstallmentStatus.OVERDUE || InstallmentStatus.PARTIAL,
      },
    });

    return unpaidCount === 0;
  }
}