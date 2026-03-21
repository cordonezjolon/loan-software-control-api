import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsDateString,
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
  @ApiProperty({ description: 'Street address', example: '123 Main St' })
  street: string;

  @IsString()
  @ApiProperty({ description: 'City', example: 'New York' })
  city: string;

  @IsString()
  @ApiProperty({ description: 'State/Province', example: 'NY' })
  state: string;

  @IsString()
  @ApiProperty({ description: 'ZIP/Postal code', example: '10001' })
  zipCode: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Country', example: 'USA', required: false })
  country?: string;
}

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ 
    description: 'First name', 
    example: 'John',
    minLength: 2,
    maxLength: 50
  })
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @ApiProperty({ 
    description: 'Last name', 
    example: 'Doe',
    minLength: 2,
    maxLength: 50
  })
  lastName: string;

  @IsEmail()
  @ApiProperty({ 
    description: 'Email address', 
    example: 'john.doe@email.com'
  })
  email: string;

  @IsPhoneNumber()
  @ApiProperty({ 
    description: 'Phone number in E.164 format', 
    example: '+12125550100'
  })
  phoneNumber: string;

  @IsDateString()
  @ApiProperty({ 
    description: 'Date of birth', 
    example: '1990-01-15'
  })
  dateOfBirth: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @ApiProperty({ 
    description: 'Client address',
    type: AddressDto
  })
  address: AddressDto;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ 
    description: 'Monthly income', 
    example: 5000,
    required: false
  })
  monthlyIncome?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ 
    description: 'Credit score', 
    example: 750,
    required: false
  })
  creditScore?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ 
    description: 'Employment years', 
    example: 5,
    required: false
  })
  employmentYears?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @ApiProperty({ 
    description: 'Client occupation', 
    example: 'Software Engineer',
    required: false,
    maxLength: 100
  })
  occupation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @ApiProperty({ 
    description: 'Additional notes', 
    example: 'VIP client',
    required: false,
    maxLength: 200
  })
  notes?: string;
}