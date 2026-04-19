import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
  @ApiProperty({ description: 'Username', example: 'john.doe', minLength: 3, maxLength: 50 })
  username!: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @ApiProperty({ description: 'Password (min 6 characters)', example: 'SecurePass123!' })
  password!: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  @ApiProperty({ description: 'First name', example: 'John' })
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Phone number', example: '+1234567890', required: false })
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  @ApiProperty({ description: 'User role', enum: UserRole, required: false, default: UserRole.EMPLOYEE })
  role?: UserRole;
}
