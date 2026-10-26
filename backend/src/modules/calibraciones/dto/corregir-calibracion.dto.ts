import { IsNotEmpty, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCalibracionDto } from './create-calibracion.dto.js';

/**
 * Correccion formal de un certificado sellado (HU-04): se anula el original con un
 * motivo obligatorio y se emite uno nuevo que lo reemplaza. El original no se edita.
 */
export class CorregirCalibracionDto {
  @IsString({ message: 'El motivo de anulación debe ser texto.' })
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio.' })
  @MinLength(10, { message: 'El motivo de anulación debe tener al menos 10 caracteres.' })
  motivo: string;

  /** Datos del certificado de reemplazo (el instrumento se toma del certificado original). */
  @ValidateNested()
  @Type(() => CreateCalibracionDto)
  nuevaCalibracion: CreateCalibracionDto;
}
