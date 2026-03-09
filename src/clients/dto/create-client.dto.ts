import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsDateString,
  IsObject,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AddressDto {
  @IsString()
  @ApiProperty({ description: 'Street address' })
  street: string;

  @IsString()
  @ApiProperty({ description: 'City' })
  city: string;

  @IsString()
  @ApiProperty({ description: 'State/Province' })
  state: string;

  @IsString()
  @ApiProperty({ description: 'ZIP/Postal code' })
  zipCode: string;

  @IsString()
  @ApiProperty({ description: 'Country' })
  country: string;
}

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ description: 'Client first name' })
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ description: 'Client last name' })
  lastName: string;

  @IsEmail()
  @ApiProperty({ description: 'Client email address' })
  email: string;

  @IsPhoneNumber()
  @ApiProperty({ description: 'Client phone number' })
  phoneNumber: string;

  @IsDateString()
  @ApiProperty({ description: 'Client date of birth' })
  dateOfBirth: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  @ApiProperty({ description: 'Client address', type: AddressDto })
  address: AddressDto;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Client occupation', required: false })
  occupation?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Monthly income', required: false })
  monthlyIncome?: number;
}