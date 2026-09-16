import { Injectable } from '@nestjs/common';
import { TipoInstrumento } from '../../../schemas/instrumento.schema.js';
import {
  InstrumentoValidator,
  InstrumentoValidationData,
  ValidationResult,
} from './instrumento-validator.interface.js';

@Injectable()
export class DinamometroValidator implements InstrumentoValidator {
  supports(tipo: TipoInstrumento): boolean {
    return tipo === TipoInstrumento.DINAMOMETRO;
  }

  validate(data: InstrumentoValidationData): ValidationResult {
    const errors: string[] = [];

    if (!data.capacidadMaxima || data.capacidadMaxima <= 0) {
      errors.push('La capacidad máxima del dinamómetro debe ser mayor a 0.');
    }

    if (new Date(data.fechaProximaCalibracion) <= new Date(data.fechaUltimaCalibracion)) {
      errors.push('La fecha de próxima calibración debe ser estrictamente posterior a la fecha de última calibración.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
