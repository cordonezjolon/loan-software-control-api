import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User, UserRole, UserStatus } from '../../auth/entities/user.entity';

export interface FindUsersOptions {
  skip?: number;
  take?: number;
  sortBy?: keyof User;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  includeDeleted?: boolean;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({
      where: { username },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.email = :emailOrUsername OR user.username = :emailOrUsername', {
        emailOrUsername,
      })
      .getOne();
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.repository.findOne({
      where: { passwordResetToken: token },
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.repository.findOne({
      where: { emailVerificationToken: token },
    });
  }

  async findMany(options: FindUsersOptions): Promise<[User[], number]> {
    const {
      skip = 0,
      take = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      role,
      status,
      includeDeleted = false,
    } = options;

    let query = this.repository.createQueryBuilder('user');

    if (!includeDeleted) {
      query = query.where('user.deletedAt IS NULL');
    }

    if (search) {
      query = query.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      query = query.andWhere('user.role = :role', { role });
    }

    if (status) {
      query = query.andWhere('user.status = :status', { status });
    }

    return query
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.repository.create(user);
    return this.repository.save(newUser);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async update(id: string, updates: QueryDeepPartialEntity<User>): Promise<User | null> {
    await this.repository.update(id, updates);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async restore(id: string): Promise<boolean> {
    const result = await this.repository.restore(id);
    return result.affected ? result.affected > 0 : false;
  }

  async checkIfUsernameExists(username: string, excludeId?: string): Promise<boolean> {
    let query = this.repository.createQueryBuilder('user').where('user.username = :username', {
      username,
    });

    if (excludeId) {
      query = query.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async checkIfEmailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = this.repository.createQueryBuilder('user').where('user.email = :email', {
      email,
    });

    if (excludeId) {
      query = query.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    await this.repository.increment(
      { id },
      'failedLoginAttempts',
      1,
    );
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await this.repository.update(id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async lockUser(id: string, lockUntil: Date): Promise<void> {
    await this.repository.update(id, {
      lockedUntil: lockUntil,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async updateLastPasswordChange(id: string): Promise<void> {
    await this.repository.update(id, {
      lastPasswordChangeAt: new Date(),
    });
  }
}
