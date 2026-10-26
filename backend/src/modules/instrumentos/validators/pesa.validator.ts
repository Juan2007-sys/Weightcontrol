import { Injectable } from '@nestjs/common';
import { TipoInstrumento } from '../../../schemas/instrumento.schema.js';
import {
  InstrumentoValidator,
  InstrumentoValidationData,
  ValidationResult,
} from './instrumento-validator.interface.js';
import { ValidationCollector } from './validation-collector.js';

/**
 * Pesa patron. Criterio de division de escala (HU-02): la pesa patron no tiene
 * indicador con resolucion propia, por lo que `divisionEscala` es OPCIONAL; si se
 * informa debe ser un numero finito > 0 y no puede superar el valor nominal
 * (d <= Max), porque una division mayor que la masa nominal no tiene sentido fisico.
 */
@Injectable()
export class PesaValidator implements InstrumentoValidator {
  supports(tipo: TipoInstrumento): boolean {
    return tipo === TipoInstrumento.PESA;
  }

  validate(data: InstrumentoValidationData): ValidationResult {
    const c = new ValidationCollector();

    if (!data.capacidadMaxima || data.capacidadMaxima <= 0) {
      c.add('capacidadMaxima', 'El valor nominal / capacidad de la pesa patrón debe ser mayor a 0.');
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
      } else if (data.capacidadMaxima > 0 && data.divisionEscala > data.capacidadMaxima) {
        c.add(
          'divisionEscala',
          `La división de escala (${data.divisionEscala}) no puede ser mayor al valor nominal de la pesa (${data.capacidadMaxima}).`,
        );
      }
    }

    if (new Date(data.fechaProximaCalibracion) <= new Date(data.fechaUltimaCalibracion)) {
      c.add('fechaProximaCalibracion', 'La fecha de próxima calibración debe ser estrictamente posterior a la fecha de última calibración.');
    }

    return c.result();
  }
}
