import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({
    description: 'Username',
    example: 'john.doe',
    minLength: 3,
    maxLength: 50,
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({
    description: 'Password',
    example: 'password123',
    minLength: 6,
  })
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
    required: false,
  })
  role?: UserRole = UserRole.EMPLOYEE;
}