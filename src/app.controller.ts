import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Application health check',
    description: 'Returns the application status and basic information'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Application is running',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Loan Management API is running!' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', format: 'date-time' },
        environment: { type: 'string', example: 'development' }
      }
    }
  })
  getHealth(): Record<string, unknown> {
    return this.appService.getHealth();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Detailed health check',
    description: 'Returns detailed application health status including database connectivity'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Detailed health status',
  })
  async getDetailedHealth(): Promise<Record<string, unknown>> {
    return this.appService.getDetailedHealth();
  }
}