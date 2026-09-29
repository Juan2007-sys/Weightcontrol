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

    // 1. Regla de capacidades
    if (data.capacidadMaxima === undefined || data.capacidadMaxima === null || data.capacidadMaxima <= 0) {
      errors.push('La capacidad máxima (Max) debe ser un valor estrictamente mayor a 0 según NTC 2031.');
    }

    if (data.capacidadMinima !== undefined && data.capacidadMinima !== null && data.capacidadMaxima !== undefined) {
      if (data.capacidadMinima < 0) {
        errors.push('La capacidad mínima (Min) no puede ser un valor negativo.');
      }
      if (data.capacidadMinima >= data.capacidadMaxima) {
        errors.push(
          `Inconsistencia de capacidades: La capacidad mínima (${data.capacidadMinima}) debe ser estrictamente menor a la capacidad máxima (${data.capacidadMaxima}).`,
        );
      }
    }

    // 2. Regla de división de escala (d o e)
    if (data.divisionEscala === undefined || data.divisionEscala === null || data.divisionEscala <= 0) {
      errors.push('La división de escala (d o e) es obligatoria y mayor a 0 para básculas según NTC 2031.');
    } else if (data.capacidadMaxima > 0) {
      const n = Math.round(data.capacidadMaxima / data.divisionEscala);

      switch (data.categoriaExactitud) {
        case CategoriaExactitud.CLASE_I:
          if (n < 50000) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) es inferior al mínimo metrológico para Básculas Clase I (Especial) (debe ser mayor o igual a 50.000 según NTC 2031).`,
            );
          }
          break;

        case CategoriaExactitud.CLASE_II:
          if (n < 100) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) es inferior al mínimo metrológico para Básculas Clase II (Fina) (debe estar entre 100 y 100.000 según NTC 2031).`,
            );
          } else if (n > 100000) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) excede el límite superior metrológico para Básculas Clase II (Fina) (debe estar entre 100 y 100.000 según NTC 2031).`,
            );
          }
          break;

        case CategoriaExactitud.CLASE_III:
          if (n < 500) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) es inferior al mínimo metrológico para Básculas Clase III (Media) (debe estar entre 500 y 10.000 según NTC 2031).`,
            );
          } else if (n > 10000) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) excede el límite superior metrológico para Básculas Clase III (Media) (debe estar entre 500 y 10.000 según NTC 2031).`,
            );
          }
          break;

        case CategoriaExactitud.CLASE_IIII:
          if (n < 100) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) es inferior al mínimo metrológico para Básculas Clase IIII (Ordinaria) (debe estar entre 100 y 1.000 según NTC 2031).`,
            );
          } else if (n > 1000) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) excede el límite superior metrológico para Básculas Clase IIII (Ordinaria) (debe estar entre 100 y 1.000 según NTC 2031).`,
            );
          }
          break;

        default:
          if (n < 100) {
            errors.push(
              `El número de divisiones de verificación (n = ${n.toFixed(0)}) es inferior al mínimo metrológico permitido.`,
            );
          }
          break;
      }
    }

    // 3. Regla de evidencias fotográficas obligatorias
    if (data.evidenciasFotograficas !== undefined) {
      const { fotoEquipo, fotoPrecinto, fotoUbicacion } = data.evidenciasFotograficas;
      if (!fotoEquipo || fotoEquipo.trim() === '') {
        errors.push('La evidencia fotográfica del equipo es requerida.');
      }
      if (!fotoPrecinto || fotoPrecinto.trim() === '') {
        errors.push('La evidencia fotográfica del precinto es requerida.');
      }
      if (!fotoUbicacion || fotoUbicacion.trim() === '') {
        errors.push('La evidencia fotográfica de la ubicación física es requerida.');
      }
    }

    // 4. Fechas de calibración coherentes
    if (new Date(data.fechaProximaCalibracion) <= new Date(data.fechaUltimaCalibracion)) {
      errors.push('La fecha de próxima calibración debe ser estrictamente posterior a la fecha de última calibración.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
