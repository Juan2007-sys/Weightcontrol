import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
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
} from '../../../schemas/instrumento.schema.js';
import { PropietarioDto } from './propietario.dto.js';

export class CreateInstrumentoDto {
  @IsString({ message: 'El serial debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El número de serial es requerido.' })
  serial: string;

  @IsString({ message: 'La marca debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La marca es requerida.' })
  marca: string;

  @IsString({ message: 'El modelo debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El modelo es requerido.' })
  modelo: string;

  @IsEnum(TipoInstrumento, {
    message: `El tipo de instrumento debe ser uno de: ${Object.values(TipoInstrumento).join(', ')}`,
  })
  @IsNotEmpty({ message: 'El tipo de instrumento es requerido.' })
  tipo: TipoInstrumento;

  @IsEnum(CategoriaExactitud, {
    message: `La categoría de exactitud debe ser una de: ${Object.values(CategoriaExactitud).join(', ')}`,
  })
  @IsNotEmpty({ message: 'La categoría de exactitud es requerida.' })
  categoriaExactitud: CategoriaExactitud;

  @IsNumber({}, { message: 'La capacidad máxima debe ser un valor numérico.' })
  @IsPositive({ message: 'La capacidad máxima debe ser un número estrictamente mayor a 0.' })
  @IsNotEmpty({ message: 'La capacidad máxima es requerida.' })
  capacidadMaxima: number;

  @IsEnum(UnidadMedida, {
    message: `La unidad de medida debe ser una de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  @IsNotEmpty({ message: 'La unidad de medida es requerida.' })
  unidadMedida: UnidadMedida;

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

  @IsDateString({}, { message: 'La fecha de última calibración debe ser una fecha válida (ISO 8601).' })
  @IsNotEmpty({ message: 'La fecha de última calibración es requerida.' })
  fechaUltimaCalibracion: string;

  @IsDateString({}, { message: 'La fecha de próxima calibración debe ser una fecha válida (ISO 8601).' })
  @IsNotEmpty({ message: 'La fecha de próxima calibración es requerida.' })
  fechaProximaCalibracion: string;
}
