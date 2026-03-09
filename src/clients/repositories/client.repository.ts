import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';

@Injectable()
export class ClientRepository {
  constructor(
    @InjectRepository(Client)
    private readonly repository: Repository<Client>,
  ) {}

  async findByEmail(email: string): Promise<Client | undefined> {
    const client = await this.repository.findOne({ where: { email } });
    return client ?? undefined;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Client | undefined> {
    const client = await this.repository.findOne({ where: { phoneNumber } });
    return client ?? undefined;
  }

  async searchClients(searchTerm: string): Promise<Client[]> {
    return this.repository
      .createQueryBuilder('client')
      .where(
        'client.firstName ILIKE :search OR client.lastName ILIKE :search OR client.email ILIKE :search',
        { search: `%${searchTerm}%` },
      )
      .getMany();
  }

  async getActiveClientsCount(): Promise<number> {
    return this.repository
      .createQueryBuilder('client')
      .innerJoin('client.loans', 'loan')
      .where('loan.status IN (:...activeStatuses)', {
        activeStatuses: ['active', 'pending'],
      })
      .getCount();
  }
}