import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object = plainToClass(metatype, value as object);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const errors = await validate(object as object);

    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        const constraints = error.constraints;
        return constraints ? Object.values(constraints).join(', ') : '';
      }).filter(message => message);

      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
        timestamp: new Date().toISOString(),
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return object as unknown;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype as never);
  }
}