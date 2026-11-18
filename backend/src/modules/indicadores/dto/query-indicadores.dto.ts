import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryIndicadoresDto {
  @IsOptional()
  @IsDateString({}, { message: 'fechaInicio debe ser una fecha ISO válida.' })
  fechaInicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fechaFin debe ser una fecha ISO válida.' })
  fechaFin?: string;

  @IsOptional()
  @IsString()
  tipoEquipo?: string;
}
