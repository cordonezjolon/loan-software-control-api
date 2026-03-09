import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

@Injectable()
export class UuidValidationPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (metadata.type === 'param' && metadata.data) {
      const paramName = metadata.data;
      
      // Only validate parameters that end with 'Id' or 'UUID'
      if (paramName.toLowerCase().includes('id') || paramName.toLowerCase().includes('uuid')) {
        if (!this.isValidUuid(value)) {
          throw new BadRequestException({
            message: `Invalid UUID format for parameter: ${paramName}`,
            parameter: paramName,
            value,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return value;
  }

  private isValidUuid(uuid: string): boolean {
    return uuidValidate(uuid) && uuidVersion(uuid) === 4;
  }
}