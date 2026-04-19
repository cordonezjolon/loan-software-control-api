import { Injectable, ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { User, UserStatus } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthResponse } from './dto/jwt-auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { BCRYPT_SALT_ROUNDS } from '../shared/constants';

export type AuthenticatedUser = Pick<
  User,
  | 'id'
  | 'username'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'phoneNumber'
  | 'role'
  | 'status'
  | 'emailVerified'
  | 'lastLoginAt'
  | 'lastPasswordChangeAt'
  | 'failedLoginAttempts'
  | 'lockedUntil'
  | 'metadata'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      return null;
    }

    // Check if user is locked
    if (user.isLocked()) {
      throw new UnauthorizedException(
        'Account is locked due to too many failed login attempts. Please try again later.',
      );
    }

    // Check if user can login
    if (!user.canLogin()) {
      throw new UnauthorizedException('User account is not active or email is not verified');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      // Record failed login attempt
      await this.recordFailedLoginAttempt(user.id);
      return null;
    }

    // Record successful login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    return this.toAuthenticatedUser(user);
  }

  login(user: AuthenticatedUser): JwtAuthResponse {
    const payload: JwtPayload = {
      username: user.username,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user.username} logged in successfully`);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<JwtAuthResponse> {
    const existingUserByUsername = await this.userRepository.findOne({
      where: { username: registerDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = BCRYPT_SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);
    const emailVerificationToken = this.generateRandomToken();
    const emailVerificationTokenExpiresAt = this.getExpiryDate(48); // 48 hours

    const user = this.userRepository.create({
      username: registerDto.username,
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phoneNumber: registerDto.phoneNumber,
      passwordHash: hashedPassword,
      role: registerDto.role,
      status: UserStatus.PENDING_EMAIL_VERIFICATION,
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
      failedLoginAttempts: 0,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`New user registered: ${savedUser.username}`);

    // TODO: Send email verification email
    // await this.emailService.sendVerificationEmail(savedUser.email, emailVerificationToken);

    return this.login(this.toAuthenticatedUser(savedUser));
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: AuthenticatedUser }> {
    try {
      const decoded = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });

      if (!user) {
        return { valid: false };
      }

      return { valid: true, user: this.toAuthenticatedUser(user) };
    } catch (error) {
      this.logger.warn(
        `Invalid token validation attempt: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { valid: false };
    }
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user ?? undefined;
  }

  private async recordFailedLoginAttempt(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const MAX_FAILED_ATTEMPTS = 5;
    const LOCK_DURATION_MINUTES = 30;

    await this.userRepository.increment({ id: userId }, 'failedLoginAttempts', 1);

    if (user.failedLoginAttempts + 1 >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
      await this.userRepository.update(userId, { lockedUntil: lockUntil });
      this.logger.warn(`User account locked due to failed login attempts: ${user.username}`);
    }
  }

  private generateRandomToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getExpiryDate(hours: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      lastPasswordChangeAt: user.lastPasswordChangeAt,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      metadata: user.metadata,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }
}
