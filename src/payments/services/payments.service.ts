import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoanPayment, PaymentMethod, PaymentStatus } from '../entities/loan-payment.entity';
import { InstallmentsService } from '../../installments/installments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginatedResult } from '../../shared/interfaces/paginated-result.interface';

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
    private readonly installmentsService: InstallmentsService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<LoanPayment> {
    const installment = await this.installmentsService.findOne(dto.installmentId);

    if (installment.status === 'paid') {
      throw new BadRequestException('Installment is already fully paid');
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

    await this.installmentsService.markAsPaid(dto.installmentId, dto.amount);

    return saved;
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
}
