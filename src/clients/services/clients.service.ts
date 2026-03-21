import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

import { Client } from '../entities/client.entity';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { FindClientsDto, ClientSortBy, SortOrder } from '../dto/find-clients.dto';
import { RiskProfile } from '@/shared/services/loan-calculation.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Check for duplicate email
    const existingClient = await this.clientRepository.findOne({
      where: { email: createClientDto.email },
    });

    if (existingClient) {
      throw new ConflictException('Client with this email already exists');
    }

    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);

    this.logger.log(`New client created: ${savedClient.firstName} ${savedClient.lastName} (${savedClient.email})`);

    return savedClient;
  }

  async findAll(query: FindClientsDto): Promise<{ data: Client[]; total: number; page: number; totalPages: number }> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      sortBy = ClientSortBy.CREATED_AT, 
      sortOrder = SortOrder.DESC,
      minCreditScore,
      minMonthlyIncome 
    } = query;

    const queryBuilder = this.clientRepository.createQueryBuilder('client');

    // Search functionality
    if (search) {
      queryBuilder.where(
        '(client.firstName ILIKE :search OR client.lastName ILIKE :search OR client.email ILIKE :search OR client.phoneNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Credit score filter
    if (minCreditScore) {
      queryBuilder.andWhere('client.creditScore >= :minCreditScore', { minCreditScore });
    }

    // Monthly income filter
    if (minMonthlyIncome) {
      queryBuilder.andWhere('client.monthlyIncome >= :minMonthlyIncome', { minMonthlyIncome });
    }

    // Sorting
    let orderByField: string;
    switch (sortBy) {
      case ClientSortBy.NAME:
        orderByField = 'client.firstName';
        break;
      case ClientSortBy.EMAIL:
        orderByField = 'client.email';
        break;
      case ClientSortBy.MONTHLY_INCOME:
        orderByField = 'client.monthlyIncome';
        break;
      case ClientSortBy.CREDIT_SCORE:
        orderByField = 'client.creditScore';
        break;
      default:
        orderByField = 'client.createdAt';
    }

    queryBuilder
      .orderBy(orderByField, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, totalPages };
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['loans'],
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async findByEmail(email: string): Promise<Client | null> {
    return this.clientRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    // Check email uniqueness if email is being updated
    if (updateClientDto.email && updateClientDto.email !== client.email) {
      const existingClient = await this.findByEmail(updateClientDto.email);
      if (existingClient) {
        throw new ConflictException('Client with this email already exists');
      }
    }

    Object.assign(client, updateClientDto);
    const updatedClient = await this.clientRepository.save(client);

    this.logger.log(`Client updated: ${updatedClient.firstName} ${updatedClient.lastName} (${id})`);

    return updatedClient;
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);

    // Check if client has active loans
    if (client.loans && client.loans.length > 0) {
      const hasActiveLoans = client.loans.some(loan => 
        loan.status === 'active' || loan.status === 'approved'
      );
      if (hasActiveLoans) {
        throw new ConflictException('Cannot delete client with active loans');
      }
    }

    await this.clientRepository.remove(client);
    this.logger.log(`Client deleted: ${client.firstName} ${client.lastName} (${id})`);
  }

  async getClientStats(): Promise<{
    totalClients: number;
    newClientsThisMonth: number;
    averageCreditScore: number;
    averageMonthlyIncome: number;
  }> {
    const totalClients = await this.clientRepository.count();

    // New clients this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const newClientsThisMonth = await this.clientRepository.count({
      where: {
        createdAt: MoreThanOrEqual(firstDayOfMonth),
      },
    });

    // Average credit score
    const creditScoreResult = await this.clientRepository
      .createQueryBuilder('client')
      .select('AVG(client.creditScore)', 'average')
      .where('client.creditScore IS NOT NULL')
      .getRawOne();

    // Average monthly income
    const incomeResult = await this.clientRepository
      .createQueryBuilder('client')
      .select('AVG(client.monthlyIncome)', 'average')
      .where('client.monthlyIncome IS NOT NULL')
      .getRawOne();

    return {
      totalClients,
      newClientsThisMonth,
      averageCreditScore: Math.round(creditScoreResult?.average || 0),
      averageMonthlyIncome: Math.round(incomeResult?.average || 0),
    };
  }

  /**
   * Get client's risk profile for loan calculations
   */
  async getClientRiskProfile(clientId: string): Promise<RiskProfile> {
    const client = await this.findOne(clientId);

    return {
      creditScore: client.creditScore || 650, // Use 650 as default if not provided
      debtToIncomeRatio: 0.3, // This would typically be calculated from actual debt information
      employmentYears: client.employmentYears || 1,
      monthlyIncome: client.monthlyIncome || 0,
    };
  }

  /**
   * Search clients for loan officer assignment
   */
  async searchClientsForLoan(searchTerm: string): Promise<Client[]> {
    return this.clientRepository
      .createQueryBuilder('client')
      .where(
        'client.firstName ILIKE :search OR client.lastName ILIKE :search OR client.email ILIKE :search'
      )
      .andWhere('client.monthlyIncome > 0') // Only show clients with income
      .setParameter('search', `%${searchTerm}%`)
      .orderBy('client.creditScore', 'DESC')
      .limit(10)
      .getMany();
  }

  /**
   * Get clients eligible for loans (basic qualification)
   */
  async getEligibleClients(): Promise<Client[]> {
    return this.clientRepository
      .createQueryBuilder('client')
      .where('client.creditScore >= :minScore', { minScore: 550 })
      .andWhere('client.monthlyIncome >= :minIncome', { minIncome: 2000 })
      .orderBy('client.creditScore', 'DESC')
      .getMany();
  }

  /**
   * Check loan eligibility for a client
   */
  async checkLoanEligibility(clientId: string): Promise<{
    isEligible: boolean;
    reason?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const client = await this.findOne(clientId);
    
    // Basic eligibility checks
    if (!client.isActive) {
      return {
        isEligible: false,
        reason: 'Client account is inactive',
      };
    }

    // Credit score check
    if (client.creditScore && client.creditScore < 500) {
      return {
        isEligible: false,
        reason: 'Credit score too low (minimum 500 required)',
      };
    }

    // Debt-to-income ratio check
    if (client.debtToIncomeRatio && client.debtToIncomeRatio > 0.6) {
      return {
        isEligible: false,
        reason: 'Debt-to-income ratio too high (maximum 60% allowed)',
      };
    }

    // Check for existing loans (if applicable)
    const existingActiveLoans = client.loans?.filter(loan => 
      loan.status === 'active' || loan.status === 'approved'
    ) || [];

    if (existingActiveLoans.length >= 3) {
      return {
        isEligible: false,
        reason: 'Too many existing active loans (maximum 3 allowed)',
      };
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    
    if (client.creditScore) {
      if (client.creditScore >= 750) {
        riskLevel = 'LOW';
      } else if (client.creditScore < 650) {
        riskLevel = 'HIGH';
      }
    }

    return {
      isEligible: true,
      riskLevel,
    };
  }
}