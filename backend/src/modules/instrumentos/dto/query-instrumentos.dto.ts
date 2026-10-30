import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsDateString,
  IsIn,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../../../schemas/instrumento.schema.js';

export class QueryInstrumentosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página mínima es 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(1, { message: 'El límite mínimo es 1.' })
  @Max(100, { message: 'El límite máximo por página es 100.' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto.' })
  search?: string;

  @IsOptional()
  @IsEnum(TipoInstrumento, {
    message: `El tipo debe ser uno de: ${Object.values(TipoInstrumento).join(', ')}`,
  })
  tipo?: TipoInstrumento;

  @IsOptional()
  @IsEnum(EstadoInstrumento, {
    message: `El estado debe ser uno de: ${Object.values(EstadoInstrumento).join(', ')}`,
  })
  estado?: EstadoInstrumento;

  @IsOptional()
  @IsEnum(CategoriaExactitud, {
    message: `La categoría de exactitud debe ser una de: ${Object.values(CategoriaExactitud).join(', ')}`,
  })
  categoriaExactitud?: CategoriaExactitud;

  @IsOptional()
  @IsEnum(UnidadMedida, {
    message: `La unidad de medida debe ser una de: ${Object.values(UnidadMedida).join(', ')}`,
  })
  unidadMedida?: UnidadMedida;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'], {
    message: 'El ordenamiento debe ser asc o desc.',
  })
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC' = 'desc';

  @IsOptional()
  @IsDateString({}, { message: 'fechaDesde debe ser una fecha ISO válida.' })
  fechaDesde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fechaHasta debe ser una fecha ISO válida.' })
  fechaHasta?: string;

  /** HU-10 */
  @IsOptional()
  @IsString()
  marca?: string;

  /** HU-10: 'true' | 'false' (HU-08: consultar inactivos). Sin valor devuelve todos. */
  @IsOptional()
  @IsIn(['true', 'false'], { message: 'activo debe ser true o false.' })
  activo?: 'true' | 'false';

  /** HU-10: rango de capacidad maxima. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'capacidadDesde debe ser numerico.' })
  @Min(0)
  capacidadDesde?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'capacidadHasta debe ser numerico.' })
  @Min(0)
  capacidadHasta?: number;

  /** HU-10: fecha de registro (createdAt). */
  @IsOptional()
  @IsDateString({}, { message: 'registroDesde debe ser una fecha ISO valida.' })
  registroDesde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'registroHasta debe ser una fecha ISO valida.' })
  registroHasta?: string;
}
