import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import {
  InstrumentoValidator,
  InstrumentoValidationData,
  ValidationResult,
} from './instrumento-validator.interface.js';

/**
 * Token de inyeccion (M1) con la lista de validators. El modulo la construye a partir
 * de un unico arreglo `INSTRUMENTO_VALIDATOR_CLASSES` (ver instrumentos.module.ts):
 * un tipo nuevo = su clase + una linea en ese arreglo. El motor no conoce las clases.
 */
export const INSTRUMENTO_VALIDATORS = 'INSTRUMENTO_VALIDATORS';

@Injectable()
export class ValidationEngineService {
  constructor(
    @Inject(INSTRUMENTO_VALIDATORS)
    private readonly validators: InstrumentoValidator[],
  ) {}

  validate(data: InstrumentoValidationData): ValidationResult {
    const validator = this.validators.find((v) => v.supports(data.tipo));

    if (!validator) {
      // Un tipo sin validator ya no pasa en silencio: se rechaza de forma explicita.
      return {
        isValid: false,
        errors: [
          `No existe un validador normativo registrado para el tipo de instrumento "${data.tipo}".`,
        ],
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
        fieldErrors: result.fieldErrors,
      });
    }
  }
}
