import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateConexionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la conexión es obligatorio.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El código del sistema externo es obligatorio.' })
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  codigoSistema: string;

  @IsUrl({ require_tld: false }, { message: 'endpointUrl debe ser una URL válida.' })
  endpointUrl: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permisos?: string[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
