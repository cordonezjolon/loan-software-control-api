import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { ClientsService } from '../services/clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { FindClientsDto } from '../dto/find-clients.dto';
import { Client } from '../entities/client.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@/auth/entities/user.entity';

@ApiTags('Clients')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER, UserRole.EMPLOYEE)
  @ApiOperation({ 
    summary: 'Create new client',
    description: 'Creates a new client profile with validation'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Client successfully created',
    type: Client,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Client with this email already exists',
  })
  @ApiBody({ type: CreateClientDto })
  async create(@Body() createClientDto: CreateClientDto): Promise<Client> {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER, UserRole.EMPLOYEE)
  @ApiOperation({ 
    summary: 'Get all clients with filtering and pagination',
    description: 'Retrieves clients with search, filtering, and pagination support'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Clients retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Client' } },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(@Query() query: FindClientsDto): Promise<unknown> {
    return this.clientsService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Get client statistics',
    description: 'Retrieves aggregate statistics about clients'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalClients: { type: 'number' },
        newClientsThisMonth: { type: 'number' },
        averageCreditScore: { type: 'number' },
        averageMonthlyIncome: { type: 'number' },
      },
    },
  })
  async getStats(): Promise<unknown> {
    return this.clientsService.getClientStats();
  }

  @Get('eligible')
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Get loan-eligible clients',
    description: 'Retrieves clients that meet basic loan eligibility criteria'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Eligible clients retrieved successfully',
    type: [Client],
  })
  async getEligibleClients(): Promise<Client[]> {
    return this.clientsService.getEligibleClients();
  }

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER, UserRole.EMPLOYEE)
  @ApiOperation({ 
    summary: 'Search clients for loan assignment',
    description: 'Quick search for clients suitable for loan processing'
  })
  @ApiQuery({ 
    name: 'term', 
    description: 'Search term for client name or email',
    example: 'john'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Clients found successfully',
    type: [Client],
  })
  async searchForLoan(@Query('term') searchTerm: string): Promise<Client[]> {
    return this.clientsService.searchClientsForLoan(searchTerm);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER, UserRole.EMPLOYEE)
  @ApiOperation({ 
    summary: 'Get client by ID',
    description: 'Retrieves a specific client by their unique identifier'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Client UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client retrieved successfully',
    type: Client,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Client> {
    return this.clientsService.findOne(id);
  }

  @Get(':id/risk-profile')
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER)
  @ApiOperation({ 
    summary: 'Get client risk profile',
    description: 'Retrieves client risk profile for loan calculations'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Client UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Risk profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        creditScore: { type: 'number' },
        debtToIncomeRatio: { type: 'number' },
        employmentYears: { type: 'number' },
        monthlyIncome: { type: 'number' },
      },
    },
  })
  async getRiskProfile(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.clientsService.getClientRiskProfile(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.LOAN_OFFICER, UserRole.EMPLOYEE)
  @ApiOperation({ 
    summary: 'Update client',
    description: 'Updates an existing client profile'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Client UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client updated successfully',
    type: Client,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already in use by another client',
  })
  @ApiBody({ type: UpdateClientDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<Client> {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Delete client',
    description: 'Deletes a client (admin only, cannot delete clients with active loans)'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Client UUID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Client deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot delete client with active loans',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.clientsService.remove(id);
    return { message: 'Client deleted successfully' };
  }
}