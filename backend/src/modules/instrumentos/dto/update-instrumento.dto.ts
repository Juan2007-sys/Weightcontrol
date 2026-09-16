import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../../../schemas/instrumento.schema.js';
import { PropietarioDto } from './propietario.dto.js';

export class UpdateInstrumentoDto {
  @IsOptional()
  @IsString({ message: 'El serial debe ser una cadena de texto.' })
  serial?: string;

  @IsOptional()
  @IsString({ message: 'La marca debe ser una cadena de texto.' })
  marca?: string;

  @IsOptional()
  @IsString({ message: 'El modelo debe ser una cadena de texto.' })
  modelo?: string;

  @IsOptional()
  @IsEnum(TipoInstrumento, {
    message: `El tipo de instrumento debe ser uno de: ${Object.values(TipoInstrumento).join(', ')}`,
  })
  tipo?: TipoInstrumento;

  @IsOptional()
  @IsEnum(CategoriaExactitud, {
    message: `La categoría de exactitud debe ser una de: ${Object.values(CategoriaExactitud).join(', ')}`,
  })
  categoriaExactitud?: CategoriaExactitud;

  @IsOptional()
  @IsNumber({}, { message: 'La capacidad máxima debe ser un valor numérico.' })
  @IsPositive({ message: 'La capacidad máxima debe ser un número estrictamente mayor a 0.' })
  capacidadMaxima?: number;

  @IsOptional()
  @IsEnum(UnidadMedida, {
    message: `La unidad de medida debe ser una de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  unidadMedida?: UnidadMedida;

  @IsOptional()
  @IsNumber({}, { message: 'La división de escala debe ser un valor numérico.' })
  @IsPositive({ message: 'La división de escala debe ser mayor a 0.' })
  divisionEscala?: number;

  @IsOptional()
  @IsString({ message: 'El código de precinto SIMEL debe ser una cadena de texto.' })
  codigoPrecintoSIMEL?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PropietarioDto)
  propietario?: PropietarioDto;

  @IsOptional()
  @IsString({ message: 'La ubicación física debe ser texto.' })
  ubicacionFisica?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de última calibración debe ser una fecha válida (ISO 8601).' })
  fechaUltimaCalibracion?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de próxima calibración debe ser una fecha válida (ISO 8601).' })
  fechaProximaCalibracion?: string;

  @IsOptional()
  @IsEnum(EstadoInstrumento, {
    message: `El estado debe ser uno de: ${Object.values(EstadoInstrumento).join(', ')}`,
  })
  estado?: EstadoInstrumento;
}
