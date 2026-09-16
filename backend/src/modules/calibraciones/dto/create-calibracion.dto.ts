import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResultadoCalibracion } from '../../../schemas/calibracion.schema.js';
import { PatronUtilizadoDto } from './patron-utilizado.dto.js';
import { PuntoMedicionErrorDto } from './punto-medicion-error.dto.js';

export class CreateCalibracionDto {
  @IsString({ message: 'El ID del instrumento debe ser texto.' })
  @IsNotEmpty({ message: 'El ID del instrumento es requerido.' })
  instrumentoId: string;

  @IsString({ message: 'El laboratorio acreditado debe ser texto.' })
  @IsNotEmpty({ message: 'El laboratorio acreditado es requerido.' })
  laboratorioAcreditado: string;

  @IsString({ message: 'El número de certificado debe ser texto.' })
  @IsNotEmpty({ message: 'El número de certificado es requerido.' })
  numeroCertificado: string;

  @IsDateString({}, { message: 'La fecha de calibración debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La fecha de calibración es requerida.' })
  fechaCalibracion: string;

  @IsDateString({}, { message: 'La fecha de próxima calibración debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La fecha de próxima calibración es requerida.' })
  fechaProximaCalibracion: string;

  @IsEnum(ResultadoCalibracion, {
    message: `El resultado debe ser uno de: ${Object.values(ResultadoCalibracion).join(', ')}`,
  })
  @IsNotEmpty({ message: 'El resultado de la calibración es requerido.' })
  resultado: ResultadoCalibracion;

  @IsOptional()
  @IsString({ message: 'El código de precinto SIMEL debe ser texto.' })
  codigoPrecintoSIMEL?: string;

  @IsOptional()
  @IsArray({ message: 'Los patrones utilizados deben ser una lista.' })
  @ValidateNested({ each: true })
  @Type(() => PatronUtilizadoDto)
  patronesUtilizados?: PatronUtilizadoDto[];

  @IsOptional()
  @IsArray({ message: 'Los errores de medición deben ser una lista.' })
  @ValidateNested({ each: true })
  @Type(() => PuntoMedicionErrorDto)
  erroresMaximosPermitidos?: PuntoMedicionErrorDto[];

  @IsOptional()
  @IsString({ message: 'La incertidumbre expandida debe ser texto.' })
  incertidumbreExpandida?: string;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto.' })
  observaciones?: string;

  @IsOptional()
  @IsString({ message: 'La URL del informe debe ser texto.' })
  archivoInformeUrl?: string;
}
