import { IsEmail, IsEnum, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @ApiProperty({ description: 'Email address', example: 'john@example.com', required: false })
  email?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  @ApiProperty({ description: 'First name', example: 'John', required: false })
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  @ApiProperty({ description: 'Last name', example: 'Doe', required: false })
  lastName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Phone number', example: '+1234567890', required: false })
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
  @ApiProperty({ description: 'User role', enum: UserRole, required: false })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: `Status must be one of: ${Object.values(UserStatus).join(', ')}` })
  @ApiProperty({ description: 'Account status', enum: UserStatus, required: false })
  status?: UserStatus;

  @IsOptional()
  @IsObject()
  @ApiProperty({ description: 'Arbitrary user metadata', required: false, type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}
