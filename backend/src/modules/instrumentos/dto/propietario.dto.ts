import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PropietarioDto {
  @IsString({ message: 'El nombre o razón social debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre o razón social del propietario es requerido.' })
  nombreRazonSocial: string;

  @IsString({ message: 'El NIT o RUT debe ser texto.' })
  @IsNotEmpty({ message: 'El NIT o RUT del propietario es requerido.' })
  nitRut: string;

  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto.' })
  direccion?: string;

  @IsOptional()
  @IsString({ message: 'La ciudad debe ser texto.' })
  ciudad?: string;

  @IsOptional()
  @IsString({ message: 'El departamento debe ser texto.' })
  departamento?: string;
}
