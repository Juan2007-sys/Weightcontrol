import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CategoriaExactitud,
  TipoInstrumento,
} from '../../../schemas/instrumento.schema.js';

export class SincronizarEquipoDto {
  @IsString()
  @IsNotEmpty({ message: 'El serial del equipo es obligatorio.' })
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  serial: string;

  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria.' })
  marca: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio.' })
  modelo: string;

  @IsEnum(TipoInstrumento, { message: 'El tipo de instrumento no es válido.' })
  tipo: TipoInstrumento;

  @IsEnum(CategoriaExactitud, { message: 'La categoría de exactitud no es válida.' })
  categoriaExactitud: CategoriaExactitud;

  @IsNumber({}, { message: 'capacidadMaxima debe ser un número.' })
  @Min(0.001, { message: 'capacidadMaxima debe ser mayor a 0.' })
  capacidadMaxima: number;

  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @IsDateString({}, { message: 'fechaUltimaCalibracion debe ser una fecha ISO válida.' })
  fechaUltimaCalibracion: string;

  @IsDateString({}, { message: 'fechaProximaCalibracion debe ser una fecha ISO válida.' })
  fechaProximaCalibracion: string;

  @IsOptional()
  @IsString()
  codigoPrecintoSIMEL?: string;
}
