import { Injectable, BadRequestException } from '@nestjs/common';
import { TipoInstrumento } from '../../../schemas/instrumento.schema.js';
import {
  InstrumentoValidator,
  InstrumentoValidationData,
  ValidationResult,
} from './instrumento-validator.interface.js';
import { BasculaValidator } from './bascula.validator.js';
import { PesaValidator } from './pesa.validator.js';
import { DinamometroValidator } from './dinamometro.validator.js';

@Injectable()
export class ValidationEngineService {
  private readonly validators: InstrumentoValidator[];

  constructor(
    basculaValidator: BasculaValidator,
    pesaValidator: PesaValidator,
    dinamometroValidator: DinamometroValidator,
  ) {
    this.validators = [basculaValidator, pesaValidator, dinamometroValidator];
  }

  validate(data: InstrumentoValidationData): ValidationResult {
    const validator = this.validators.find((v) => v.supports(data.tipo));

    if (!validator) {
      return {
        isValid: true,
        errors: [],
      };
    }

    return validator.validate(data);
  }

  assertValid(data: InstrumentoValidationData): void {
    const result = this.validate(data);
    if (!result.isValid) {
      throw new BadRequestException({
        message: 'El instrumento no cumple con los criterios metrológicos y normativos.',
        errors: result.errors,
      });
    }
  }
}
