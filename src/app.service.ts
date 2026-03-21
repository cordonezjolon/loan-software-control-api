import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  getHealth(): Record<string, unknown> {
    return {
      message: 'Loan Management API is running!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV', 'development'),
    };
  }

  async getDetailedHealth(): Promise<Record<string, unknown>> {
    const basicHealth = this.getHealth();
    
    try {
      // Check database connectivity
      await this.dataSource.query('SELECT 1');
      
      return {
        ...basicHealth,
        database: {
          status: 'connected',
          type: 'postgresql',
          host: this.configService.get<string>('DB_HOST'),
          database: this.configService.get<string>('DB_NAME'),
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
        uptime: Math.round(process.uptime()),
      };
    } catch (error) {
      return {
        ...basicHealth,
        database: {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
        uptime: Math.round(process.uptime()),
      };
    }
  }
}