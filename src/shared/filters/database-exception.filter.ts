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
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database operation failed';
    let details: string | undefined;

    if (exception instanceof QueryFailedError) {
      const error = exception.driverError;
      
      switch (error.code) {
        case '23505': // Unique constraint violation
          status = HttpStatus.CONFLICT;
          message = 'Resource already exists';
          details = 'A record with this information already exists';
          break;
        case '23503': // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference';
          details = 'Referenced resource does not exist';
          break;
        case '23502': // Not null constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Missing required field';
          details = 'Required field cannot be null';
          break;
        case '23514': // Check constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid data';
          details = 'Data does not meet validation requirements';
          break;
        default:
          this.logger.error(
            `Database error: ${exception.message}`,
            exception.stack,
            `${request.method} ${request.url}`,
          );
      }
    } else {
      this.logger.error(
        `Database error: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}