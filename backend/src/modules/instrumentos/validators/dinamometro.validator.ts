import { Injectable } from '@nestjs/common';
import { TipoInstrumento } from '../../../schemas/instrumento.schema.js';
import {
  InstrumentoValidator,
  InstrumentoValidationData,
  ValidationResult,
} from './instrumento-validator.interface.js';
import { ValidationCollector } from './validation-collector.js';

/**
 * Dinamometro. Criterio de division de escala (HU-02): `divisionEscala` es la
 * resolucion del indicador y es OPCIONAL por compatibilidad con registros previos;
 * si se informa debe ser > 0, no puede superar la capacidad maxima y debe ofrecer al
 * menos 100 divisiones (Max / d >= 100, es decir resolucion <= 1 % de Max), umbral
 * conservador alineado con la practica de ISO 376 para instrumentos de fuerza.
 */
@Injectable()
export class DinamometroValidator implements InstrumentoValidator {
  supports(tipo: TipoInstrumento): boolean {
    return tipo === TipoInstrumento.DINAMOMETRO;
  }

  validate(data: InstrumentoValidationData): ValidationResult {
    const c = new ValidationCollector();

    if (!data.capacidadMaxima || data.capacidadMaxima <= 0) {
      c.add('capacidadMaxima', 'La capacidad máxima del dinamómetro debe ser mayor a 0.');
    }

    if (data.capacidadMinima !== undefined && data.capacidadMinima !== null && data.capacidadMaxima !== undefined) {
      if (data.capacidadMinima < 0) {
        c.add('capacidadMinima', 'La capacidad mínima (Min) no puede ser un valor negativo.');
      }
      if (data.capacidadMinima >= data.capacidadMaxima) {
        c.add(
          'capacidadMinima',
          `Inconsistencia de capacidades: La capacidad mínima (${data.capacidadMinima}) debe ser estrictamente menor a la capacidad máxima (${data.capacidadMaxima}).`,
        );
      }
    }

    if (data.divisionEscala !== undefined && data.divisionEscala !== null) {
      if (!Number.isFinite(data.divisionEscala) || data.divisionEscala <= 0) {
        c.add('divisionEscala', 'La división de escala (d), si se informa, debe ser un valor mayor a 0.');
      } else if (data.capacidadMaxima > 0) {
        if (data.divisionEscala > data.capacidadMaxima) {
          c.add(
            'divisionEscala',
            `La división de escala (${data.divisionEscala}) no puede ser mayor a la capacidad máxima (${data.capacidadMaxima}).`,
          );
        } else {
          const n = Math.round(data.capacidadMaxima / data.divisionEscala);
          if (n < 100) {
            c.add(
              'divisionEscala',
              `El número de divisiones (n = ${n}) es inferior al mínimo de 100 para dinamómetros (la resolución debe ser menor o igual al 1 % de la capacidad máxima).`,
            );
          }
        }
      }
    }

    if (new Date(data.fechaProximaCalibracion) <= new Date(data.fechaUltimaCalibracion)) {
      c.add('fechaProximaCalibracion', 'La fecha de próxima calibración debe ser estrictamente posterior a la fecha de última calibración.');
    }

    return c.result();
  }
}
