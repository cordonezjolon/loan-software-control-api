import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User, UserStatus } from '../../auth/entities/user.entity';
import { UserRepository, FindUsersOptions } from '../repositories/user.repository';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { UpdateUserDto } from '../../auth/dto/update-user.dto';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../../auth/dto/password-management.dto';
import { UserProfileDto, UserListDto } from '../../auth/dto/user-profile.dto';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  private readonly PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24;
  private readonly EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 48;
  private readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;

  constructor(private readonly userRepository: UserRepository) {}

  // ==================== User Retrieval ====================

  async findById(id: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToUserProfileDto(user);
  }

  async findByUsername(username: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToUserProfileDto(user);
  }

  async findByEmail(email: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToUserProfileDto(user);
  }

  async findMany(options: FindUsersOptions): Promise<{ data: UserListDto[]; total: number }> {
    const [users, total] = await this.userRepository.findMany(options);
    const data = users.map(user => this.mapToUserListDto(user));
    return { data, total };
  }

  // ==================== User Creation & Management ====================

  async createUser(createUserDto: CreateUserDto): Promise<UserProfileDto> {
    const usernameExists = await this.userRepository.checkIfUsernameExists(createUserDto.username);
    if (usernameExists) {
      throw new ConflictException('Username already exists');
    }

    const emailExists = await this.userRepository.checkIfEmailExists(createUserDto.email);
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, BCRYPT_SALT_ROUNDS);
    const emailVerificationToken = this.generateRandomToken();
    const emailVerificationTokenExpiresAt = this.getExpiryDate(
      this.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
    );

    const user = await this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phoneNumber: createUserDto.phoneNumber,
      passwordHash: hashedPassword,
      role: createUserDto.role,
      status: UserStatus.PENDING_EMAIL_VERIFICATION,
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
      failedLoginAttempts: 0,
    });

    this.logger.log(`User created: ${user.username} (${user.email})`);

    // TODO: Send email verification email
    // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    return this.mapToUserProfileDto(user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.ensureEmailAvailability(id, user.email, updateUserDto.email);

    const updates = this.buildUserUpdates(user, updateUserDto);

    const updatedUser = await this.userRepository.update(id, updates);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`User updated: ${user.username}`);
    return this.mapToUserProfileDto(updatedUser);
  }

  async deleteUser(id: string, soft: boolean = true): Promise<void> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (soft) {
      await this.userRepository.softDelete(id);
      this.logger.log(`User soft deleted: ${user.username}`);
    } else {
      await this.userRepository.hardDelete(id);
      this.logger.log(`User hard deleted: ${user.username}`);
    }
  }

  async restoreUser(id: string): Promise<UserProfileDto> {
    const restored = await this.userRepository.restore(id);
    if (!restored) {
      throw new NotFoundException('User not found or already active');
    }

    const user = await this.userRepository.findOne(id);
    this.logger.log(`User restored: ${user?.username}`);

    return this.mapToUserProfileDto(user!);
  }

  // ==================== Password Management ====================

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const passwordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(userId, {
      passwordHash: hashedPassword,
      lastPasswordChangeAt: new Date(),
    });

    this.logger.log(`Password changed for user: ${user.username}`);
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Security: Don't reveal if email exists
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return 'If this email exists in our system, a password reset link will be sent.';
    }

    const passwordResetToken = this.generateRandomToken();
    const passwordResetTokenExpiresAt = this.getExpiryDate(this.PASSWORD_RESET_TOKEN_EXPIRY_HOURS);

    await this.userRepository.update(user.id, {
      passwordResetToken,
      passwordResetTokenExpiresAt,
    });

    // TODO: Send password reset email
    // await this.emailService.sendPasswordResetEmail(user.email, passwordResetToken);

    this.logger.log(`Password reset requested for user: ${user.username}`);
    return 'If this email exists in our system, a password reset link will be sent.';
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(resetPasswordDto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (user.passwordResetTokenExpiresAt! < new Date()) {
      throw new BadRequestException('Password reset token has expired');
    }

    if (resetPasswordDto.password !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(user.id, {
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
      lastPasswordChangeAt: new Date(),
    });

    this.logger.log(`Password reset completed for user: ${user.username}`);
  }

  // ==================== Email Verification ====================

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const user = await this.userRepository.findByEmailVerificationToken(verifyEmailDto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    if (user.emailVerificationTokenExpiresAt! < new Date()) {
      throw new BadRequestException('Email verification token has expired');
    }

    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      status: UserStatus.ACTIVE,
    });

    this.logger.log(`Email verified for user: ${user.username}`);
  }

  async resendVerificationEmail(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn(`Verification email resend requested for non-existent email: ${email}`);
      return 'If this email exists in our system, a verification email will be sent.';
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const emailVerificationToken = this.generateRandomToken();
    const emailVerificationTokenExpiresAt = this.getExpiryDate(
      this.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
    );

    await this.userRepository.update(user.id, {
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
    });

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    this.logger.log(`Verification email resent for user: ${user.username}`);
    return 'If this email exists in our system, a verification email will be sent.';
  }

  // ==================== Account Locking & Login Attempts ====================

  async recordFailedLoginAttempt(username: string): Promise<void> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) return;

    await this.userRepository.incrementFailedLoginAttempts(user.id);

    if (user.failedLoginAttempts + 1 >= this.MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockUntil = this.getDateAddingMinutes(new Date(), this.LOCK_DURATION_MINUTES);
      await this.userRepository.lockUser(user.id, lockUntil);
      this.logger.warn(`User account locked due to failed login attempts: ${username}`);
    }
  }

  async recordSuccessfulLogin(userId: string): Promise<void> {
    await this.userRepository.updateLastLogin(userId);
  }

  // ==================== Status Management ====================

  async activateUser(id: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(id, {
      status: UserStatus.ACTIVE,
      lockedUntil: null,
    });

    this.logger.log(`User activated: ${user.username}`);
    return this.mapToUserProfileDto(updatedUser!);
  }

  async deactivateUser(id: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(id, {
      status: UserStatus.INACTIVE,
    });

    this.logger.log(`User deactivated: ${user.username}`);
    return this.mapToUserProfileDto(updatedUser!);
  }

  async suspendUser(id: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(id, {
      status: UserStatus.SUSPENDED,
    });

    this.logger.log(`User suspended: ${user.username}`);
    return this.mapToUserProfileDto(updatedUser!);
  }

  // ==================== Helper Methods ====================

  private mapToUserProfileDto(user: User): UserProfileDto {
    return new UserProfileDto({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? undefined,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt ?? undefined,
      lastPasswordChangeAt: user.lastPasswordChangeAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  private mapToUserListDto(user: User): UserListDto {
    return new UserListDto({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt ?? undefined,
      createdAt: user.createdAt,
    });
  }

  private generateRandomToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getExpiryDate(hours: number): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  private getDateAddingMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  private async ensureEmailAvailability(
    userId: string,
    currentEmail: string,
    nextEmail?: string,
  ): Promise<void> {
    if (!nextEmail || nextEmail === currentEmail) {
      return;
    }

    const emailExists = await this.userRepository.checkIfEmailExists(nextEmail, userId);
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }
  }

  private buildUserUpdates(user: User, dto: UpdateUserDto): QueryDeepPartialEntity<User> {
    const updates: QueryDeepPartialEntity<User> = {
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as QueryDeepPartialEntity<User['metadata']> }
        : {}),
    };

    if (dto.email && dto.email !== user.email) {
      updates.emailVerified = false;
      updates.status = UserStatus.PENDING_EMAIL_VERIFICATION;
      updates.emailVerificationToken = this.generateRandomToken();
      updates.emailVerificationTokenExpiresAt = this.getExpiryDate(
        this.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
      );
    }

    return updates;
  }
}
