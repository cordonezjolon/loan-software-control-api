import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @ApiProperty({ description: 'Current password', example: 'OldPass123!' })
  currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @ApiProperty({ description: 'New password', example: 'NewPass456!' })
  newPassword!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Confirm new password', example: 'NewPass456!' })
  confirmPassword!: string;
}

export class RequestPasswordResetDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  email!: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Password reset token' })
  token!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @ApiProperty({ description: 'New password', example: 'NewPass456!' })
  password!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Confirm new password', example: 'NewPass456!' })
  confirmPassword!: string;
}

export class VerifyEmailDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Email verification token' })
  token!: string;
}

export class ResendVerificationEmailDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  email!: string;
}
