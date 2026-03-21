import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, TypeORMError } from 'typeorm';

@Catch(TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: TypeORMError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ method: string; url: string }>();

    const { status, message, details } = this.buildErrorDetails(exception, request);

    response.status(status).json({
      statusCode: status,
      error: message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }

  private buildErrorDetails(
    exception: TypeORMError,
    request: { method: string; url: string },
  ): { status: number; message: string; details?: string } {
    if (!(exception instanceof QueryFailedError)) {
      this.logger.error(
        `Database error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database operation failed' };
    }

    const error = exception.driverError as { code: string };
    return this.mapDatabaseErrorCode(error.code, exception, request);
  }

  private mapDatabaseErrorCode(
    code: string,
    exception: TypeORMError,
    request: { method: string; url: string },
  ): { status: number; message: string; details?: string } {
    const errorMap: Record<string, { status: number; message: string; details: string }> = {
      '23505': { status: HttpStatus.CONFLICT, message: 'Resource already exists', details: 'A record with this information already exists' },
      '23503': { status: HttpStatus.BAD_REQUEST, message: 'Invalid reference', details: 'Referenced resource does not exist' },
      '23502': { status: HttpStatus.BAD_REQUEST, message: 'Missing required field', details: 'Required field cannot be null' },
      '23514': { status: HttpStatus.BAD_REQUEST, message: 'Invalid data', details: 'Data does not meet validation requirements' },
    };

    const mapped = errorMap[code];
    if (mapped) {
      return mapped;
    }

    this.logger.error(
      `Database error: ${exception.message}`,
      exception.stack,
      `${request.method} ${request.url}`,
    );
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database operation failed' };
  }
}