import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthResponse } from './dto/jwt-auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { BCRYPT_SALT_ROUNDS } from '../shared/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash: _passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: Omit<User, 'passwordHash'>): JwtAuthResponse {
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
    const existingUser = await this.userRepository.findOne({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    const saltRounds = BCRYPT_SALT_ROUNDS;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const user = this.userRepository.create({
      username: registerDto.username,
      passwordHash: hashedPassword,
      role: registerDto.role,
    });

    const savedUser = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...userWithoutPassword } = savedUser;

    this.logger.log(`New user registered: ${savedUser.username}`);

    return this.login(userWithoutPassword);
  }

  async validateToken(
    token: string,
  ): Promise<{ valid: boolean; user?: Omit<User, 'passwordHash'> }> {
    try {
      const decoded = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });

      if (!user) {
        return { valid: false };
      }

      const { passwordHash: _passwordHash2, ...userWithoutPassword } = user;
      return { valid: true, user: userWithoutPassword };
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
}
