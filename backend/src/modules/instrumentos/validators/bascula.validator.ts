import { Injectable } from '@nestjs/common';
import { TipoInstrumento, CategoriaExactitud } from '../../../schemas/instrumento.schema.js';
import {
  InstrumentoValidator,
  InstrumentoValidationData,
  ValidationResult,
} from './instrumento-validator.interface.js';

@Injectable()
export class BasculaValidator implements InstrumentoValidator {
  supports(tipo: TipoInstrumento): boolean {
    return tipo === TipoInstrumento.BASCULA;
  }

  validate(data: InstrumentoValidationData): ValidationResult {
    const errors: string[] = [];

    if (!data.capacidadMaxima || data.capacidadMaxima <= 0) {
      errors.push('La capacidad máxima (Max) debe ser un valor estrictamente mayor a 0 según NTC 2031.');
    }

    if (data.divisionEscala === undefined || data.divisionEscala === null || data.divisionEscala <= 0) {
      errors.push('La división de escala (d o e) es obligatoria y mayor a 0 para básculas según NTC 2031.');
    } else if (data.capacidadMaxima > 0) {
      const n = data.capacidadMaxima / data.divisionEscala;
      if (n < 100 && data.categoriaExactitud !== CategoriaExactitud.CLASE_IIII) {
        errors.push(
          `El número de divisiones de verificación (n = ${n.toFixed(0)}) es inferior al mínimo metrológico para ${data.categoriaExactitud}.`,
        );
      }
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
