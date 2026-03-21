import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { LoanPayment, PaymentStatus, PaymentMethod } from './entities/loan-payment.entity';
import { LoanInstallment, InstallmentStatus } from '../installments/entities/loan-installment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindPaymentsDto, UpdatePaymentDto, BatchPaymentDto } from './dto/payment-filters.dto';
import { InstallmentsService } from '../installments/installments.service';
import { PaginatedResult } from '../shared/interfaces/paginated-result.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(LoanPayment)
    private readonly paymentRepository: Repository<LoanPayment>,
    @InjectRepository(LoanInstallment)
    private readonly installmentRepository: Repository<LoanInstallment>,
    private readonly installmentsService: InstallmentsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new payment and update installment status
   */
  async create(createPaymentDto: CreatePaymentDto): Promise<LoanPayment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get installment with lock to prevent concurrent payments
      const installment = await queryRunner.manager.findOne(LoanInstallment, {
        where: { id: createPaymentDto.installmentId },
        relations: ['loan', 'payments'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!installment) {
        throw new NotFoundException(`Installment with ID ${createPaymentDto.installmentId} not found`);
      }

      // Validate payment amount
      const totalPaid = this.calculateTotalPaid(installment);
      const totalDue = Number(installment.totalAmount) + Number(installment.lateFee);
      const remainingAmount = totalDue - totalPaid;

      if (createPaymentDto.amount > remainingAmount) {
        throw new BadRequestException(
          `Payment amount $${createPaymentDto.amount} exceeds remaining balance $${remainingAmount}`
        );
      }

      // Create payment
      const payment = queryRunner.manager.create(LoanPayment, {
        installment,
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        paymentDate: new Date(createPaymentDto.paymentDate),
        referenceNumber: createPaymentDto.referenceNumber,
        notes: createPaymentDto.notes,
        status: PaymentStatus.COMPLETED, // Auto-complete for now
      });

      const savedPayment = await queryRunner.manager.save(LoanPayment, payment);

      // Update installment status
      const newTotalPaid = totalPaid + createPaymentDto.amount;
      let newStatus: InstallmentStatus;

      if (newTotalPaid >= totalDue) {
        newStatus = InstallmentStatus.PAID;
      } else {
        newStatus = InstallmentStatus.PARTIAL;
      }

      await queryRunner.manager.update(LoanInstallment, installment.id, { status: newStatus });

      await queryRunner.commitTransaction();

      // Return the payment with relations
      return this.findOne(savedPayment.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process batch payments (for automated payment systems)
   */
  async createBatch(batchPaymentDto: BatchPaymentDto): Promise<{
    successful: LoanPayment[];
    failed: Array<{ payment: any; error: string; }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalAmount: number;
    };
  }> {
    const results = {
      successful: [] as LoanPayment[],
      failed: [] as Array<{ payment: any; error: string; }>,
      summary: {
        total: batchPaymentDto.payments.length,
        successful: 0,
        failed: 0,
        totalAmount: 0,
      },
    };

    for (const paymentData of batchPaymentDto.payments) {
      try {
        const payment = await this.create({
          ...paymentData,
          notes: paymentData.notes ? 
            `${paymentData.notes}${batchPaymentDto.batchNotes ? ` | Batch: ${batchPaymentDto.batchNotes}` : ''}` :
            batchPaymentDto.batchNotes,
        });

        results.successful.push(payment);
        results.summary.successful++;
        results.summary.totalAmount += Number(payment.amount);
      } catch (error) {
        results.failed.push({
          payment: paymentData,
          error: error.message,
        });
        results.summary.failed++;
      }
    }

    return results;
  }

  /**
   * Find all payments with filtering and pagination
   */
  async findAll(findPaymentsDto: FindPaymentsDto): Promise<PaginatedResult<LoanPayment>> {
    const {
      page = 1,
      limit = 10,
      installmentId,
      loanId,
      clientId,
      status,
      paymentMethod,
      paymentDateFrom,
      paymentDateTo,
      minAmount,
      maxAmount,
      search,
      sortBy = 'paymentDate',
      sortOrder = 'DESC',
    } = findPaymentsDto;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.installment', 'installment')
      .leftJoinAndSelect('installment.loan', 'loan')
      .leftJoinAndSelect('loan.client', 'client');

    // Apply filters
    if (installmentId) {
      queryBuilder.andWhere('payment.installment.id = :installmentId', { installmentId });
    }

    if (loanId) {
      queryBuilder.andWhere('installment.loan.id = :loanId', { loanId });
    }

    if (clientId) {
      queryBuilder.andWhere('loan.client.id = :clientId', { clientId });
    }

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    if (paymentDateFrom) {
      queryBuilder.andWhere('payment.paymentDate >= :paymentDateFrom', { paymentDateFrom });
    }

    if (paymentDateTo) {
      queryBuilder.andWhere('payment.paymentDate <= :paymentDateTo', { paymentDateTo });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('payment.amount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('payment.amount <= :maxAmount', { maxAmount });
    }

    if (search) {
      queryBuilder.andWhere(
        '(payment.referenceNumber ILIKE :search OR payment.notes ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`payment.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [payments, total] = await queryBuilder.getManyAndCount();

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a specific payment by ID
   */
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

  /**
   * Update payment details (limited fields based on status)
   */
  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<LoanPayment> {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.COMPLETED) {
      // Only allow updating reference number and notes for completed payments
      const allowedUpdates: Partial<UpdatePaymentDto> = {};
      if (updatePaymentDto.referenceNumber !== undefined) {
        allowedUpdates.referenceNumber = updatePaymentDto.referenceNumber;
      }
      if (updatePaymentDto.notes !== undefined) {
        allowedUpdates.notes = updatePaymentDto.notes;
      }

      if (Object.keys(allowedUpdates).length === 0) {
        throw new BadRequestException('No valid updates provided for completed payment');
      }

      await this.paymentRepository.update(id, allowedUpdates);
    } else {
      await this.paymentRepository.update(id, updatePaymentDto);
    }

    return this.findOne(id);
  }

  /**
   * Cancel a pending payment
   */
  async cancel(id: string, reason: string): Promise<LoanPayment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel payment with status ${payment.status}`);
    }

    await this.paymentRepository.update(id, {
      status: PaymentStatus.CANCELLED,
      notes: payment.notes ? `${payment.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`,
    });

    return this.findOne(id);
  }

  /**
   * Mark a pending payment as failed
   */
  async markAsFailed(id: string, reason: string): Promise<LoanPayment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Cannot mark payment as failed with current status ${payment.status}`);
    }

    await this.paymentRepository.update(id, {
      status: PaymentStatus.FAILED,
      notes: payment.notes ? `${payment.notes} | Failed: ${reason}` : `Failed: ${reason}`,
    });

    return this.findOne(id);
  }

  /**
   * Get payment statistics for reporting
   */
  async getPaymentStatistics(loanId?: string, clientId?: string, dateFrom?: string, dateTo?: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    averagePaymentAmount: number;
    paymentsByMethod: Record<PaymentMethod, { count: number; amount: number }>;
    paymentsByStatus: Record<PaymentStatus, number>;
    monthlyTrend: Array<{ month: string; count: number; amount: number }>;
    largestPayment: number;
    smallestPayment: number;
  }> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');

    if (loanId) {
      queryBuilder
        .leftJoin('payment.installment', 'installment')
        .andWhere('installment.loanId = :loanId', { loanId });
    }

    if (clientId) {
      queryBuilder
        .leftJoin('payment.installment', 'installment')
        .leftJoin('installment.loan', 'loan')
        .andWhere('loan.clientId = :clientId', { clientId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('payment.paymentDate <= :dateTo', { dateTo });
    }

    const payments = await queryBuilder.getMany();

    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const averagePaymentAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;

    // Group by payment method
    const paymentsByMethod = payments.reduce((acc, payment) => {
      if (!acc[payment.paymentMethod]) {
        acc[payment.paymentMethod] = { count: 0, amount: 0 };
      }
      acc[payment.paymentMethod].count++;
      acc[payment.paymentMethod].amount += Number(payment.amount);
      return acc;
    }, {} as Record<PaymentMethod, { count: number; amount: number }>);

    // Group by status
    const paymentsByStatus = payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    // Monthly trend
    const monthlyTrend = this.calculateMonthlyTrend(payments);

    const amounts = payments.map(p => Number(p.amount));
    const largestPayment = amounts.length > 0 ? Math.max(...amounts) : 0;
    const smallestPayment = amounts.length > 0 ? Math.min(...amounts) : 0;

    return {
      totalPayments,
      totalAmount,
      averagePaymentAmount,
      paymentsByMethod,
      paymentsByStatus,
      monthlyTrend,
      largestPayment,
      smallestPayment,
    };
  }

  /**
   * Process refund for a payment
   */
  async processRefund(paymentId: string, refundAmount: number, reason: string): Promise<{
    originalPayment: LoanPayment;
    refundPayment: LoanPayment;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const originalPayment = await queryRunner.manager.findOne(LoanPayment, {
        where: { id: paymentId },
        relations: ['installment'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!originalPayment) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }

      if (originalPayment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException('Can only refund completed payments');
      }

      if (refundAmount > Number(originalPayment.amount)) {
        throw new BadRequestException('Refund amount cannot exceed original payment amount');
      }

      // Create refund payment (negative amount)
      const refundPayment = queryRunner.manager.create(LoanPayment, {
        installment: originalPayment.installment,
        amount: -refundAmount,
        paymentMethod: originalPayment.paymentMethod,
        paymentDate: new Date(),
        referenceNumber: `REFUND-${originalPayment.id.substring(0, 8)}`,
        notes: `Refund for payment ${originalPayment.id}: ${reason}`,
        status: PaymentStatus.COMPLETED,
      });

      const savedRefund = await queryRunner.manager.save(LoanPayment, refundPayment);

      // Update original payment notes
      await queryRunner.manager.update(LoanPayment, paymentId, {
        notes: originalPayment.notes ? 
          `${originalPayment.notes} | Refunded $${refundAmount}: ${reason}` :
          `Refunded $${refundAmount}: ${reason}`,
      });

      // Update installment status if necessary
      await this.recalculateInstallmentStatus(queryRunner, originalPayment.installment.id);

      await queryRunner.commitTransaction();

      return {
        originalPayment: await this.findOne(paymentId),
        refundPayment: await this.findOne(savedRefund.id),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get daily payment collections report
   */
  async getDailyCollections(date: string): Promise<{
    date: string;
    totalCollections: number;
    totalAmount: number;
    paymentsByMethod: Record<PaymentMethod, { count: number; amount: number }>;
    uniqueLoansBenefited: number;
    uniqueClientsBenefited: number;
  }> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const payments = await this.paymentRepository.find({
      where: {
        paymentDate: Between(startDate, endDate),
        status: PaymentStatus.COMPLETED,
      },
      relations: ['installment', 'installment.loan', 'installment.loan.client'],
    });

    const totalCollections = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const paymentsByMethod = payments.reduce((acc, payment) => {
      if (!acc[payment.paymentMethod]) {
        acc[payment.paymentMethod] = { count: 0, amount: 0 };
      }
      acc[payment.paymentMethod].count++;
      acc[payment.paymentMethod].amount += Number(payment.amount);
      return acc;
    }, {} as Record<PaymentMethod, { count: number; amount: number }>);

    const uniqueLoansBenefited = new Set(payments.map(p => p.installment.loan.id)).size;
    const uniqueClientsBenefited = new Set(payments.map(p => p.installment.loan.client?.id).filter(Boolean)).size;

    return {
      date,
      totalCollections,
      totalAmount,
      paymentsByMethod,
      uniqueLoansBenefited,
      uniqueClientsBenefited,
    };
  }

  /**
   * Helper method to calculate total paid amount for an installment
   */
  private calculateTotalPaid(installment: LoanInstallment): number {
    if (!installment.payments || installment.payments.length === 0) {
      return 0;
    }

    return installment.payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((total, payment) => total + Number(payment.amount), 0);
  }

  /**
   * Recalculate installment status after payment changes
   */
  private async recalculateInstallmentStatus(queryRunner: any, installmentId: string): Promise<void> {
    const installment = await queryRunner.manager.findOne(LoanInstallment, {
      where: { id: installmentId },
      relations: ['payments'],
    });

    if (!installment) return;

    const totalPaid = this.calculateTotalPaid(installment);
    const totalDue = Number(installment.totalAmount) + Number(installment.lateFee);

    let newStatus: InstallmentStatus;
    if (totalPaid <= 0) {
      newStatus = InstallmentStatus.PENDING;
    } else if (totalPaid >= totalDue) {
      newStatus = InstallmentStatus.PAID;
    } else {
      newStatus = InstallmentStatus.PARTIAL;
    }

    await queryRunner.manager.update(LoanInstallment, installmentId, { status: newStatus });
  }

  /**
   * Calculate monthly trend from payments
   */
  private calculateMonthlyTrend(payments: LoanPayment[]): Array<{ month: string; count: number; amount: number }> {
    const monthlyData = payments.reduce((acc, payment) => {
      const month = payment.paymentDate.toISOString().substring(0, 7); // YYYY-MM format
      if (!acc[month]) {
        acc[month] = { count: 0, amount: 0 };
      }
      acc[month].count++;
      acc[month].amount += Number(payment.amount);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}