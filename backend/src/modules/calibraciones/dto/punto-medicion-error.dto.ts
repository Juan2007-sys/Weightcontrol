import { IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class PuntoMedicionErrorDto {
  @IsNumber({}, { message: 'La carga nominal debe ser numérica.' })
  @IsNotEmpty({ message: 'La carga nominal es requerida.' })
  cargaNominal: number;

  @IsNumber({}, { message: 'El error encontrado debe ser numérico.' })
  @IsNotEmpty({ message: 'El error encontrado es requerido.' })
  errorEncontrado: number;

  @IsNumber({}, { message: 'El error máximo permitido (EMP) debe ser numérico.' })
  @IsNotEmpty({ message: 'El error máximo permitido (EMP) es requerido.' })
  errorMaximoPermitido: number;

  @IsBoolean({ message: 'El indicador de cumplimiento debe ser un booleano.' })
  @IsNotEmpty({ message: 'El indicador de cumplimiento es requerido.' })
  cumple: boolean;
}
