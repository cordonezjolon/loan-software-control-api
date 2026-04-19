import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsEmail,
  Length,
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
  username!: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({
    description: 'Password',
    example: 'password123',
    minLength: 6,
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  lastName!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  phoneNumber?: string;

  @IsEnum(UserRole)
  @IsOptional()
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
    required: false,
  })
  role?: UserRole;
}