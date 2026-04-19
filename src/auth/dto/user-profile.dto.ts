import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';
import { Exclude } from 'class-transformer';

export class UserProfileDto {
  @ApiProperty({ description: 'User unique identifier' })
  id!: string;

  @ApiProperty({ description: 'Username' })
  username!: string;

  @ApiProperty({ description: 'Email address' })
  email!: string;

  @ApiProperty({ description: 'First name' })
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  lastName!: string;

  @ApiProperty({ description: 'Phone number', required: false })
  phoneNumber?: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'Account status', enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ description: 'Whether email is verified' })
  emailVerified!: boolean;

  @ApiProperty({ description: 'Last login date', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Last password change date', required: false })
  lastPasswordChangeAt?: Date;

  @ApiProperty({ description: 'Account creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt!: Date;

  @Exclude()
  deletedAt?: Date;

  @Exclude()
  passwordHash?: string;

  constructor(partial: Partial<UserProfileDto>) {
    Object.assign(this, partial);
  }
}

export class UserListDto {
  @ApiProperty({ description: 'User unique identifier' })
  id!: string;

  @ApiProperty({ description: 'Username' })
  username!: string;

  @ApiProperty({ description: 'Email address' })
  email!: string;

  @ApiProperty({ description: 'Full name' })
  fullName!: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'Account status', enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ description: 'Last login date', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Account creation date' })
  createdAt!: Date;

  constructor(partial: Partial<UserListDto>) {
    Object.assign(this, partial);
  }
}
