import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class PatronUtilizadoDto {
  @IsString({ message: 'El código del patrón debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El código del patrón es requerido.' })
  codigoPatron: string;

  @IsString({ message: 'La descripción del patrón debe ser texto.' })
  @IsNotEmpty({ message: 'La descripción del patrón es requerida.' })
  descripcion: string;

  @IsString({ message: 'El certificado de trazabilidad debe ser texto.' })
  @IsNotEmpty({ message: 'El certificado de trazabilidad es requerido.' })
  certificadoTrazabilidad: string;

  @IsDateString({}, { message: 'La fecha de vencimiento del patrón debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La fecha de vencimiento del patrón es requerida.' })
  fechaVencimientoPatron: string;
}
