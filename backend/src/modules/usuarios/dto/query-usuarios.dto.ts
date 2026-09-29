import { IsEnum, IsOptional, IsString, IsBooleanString } from 'class-validator';
import { RolUsuario } from '../../../schemas/usuario.schema.js';

export class QueryUsuariosDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @IsOptional()
  @IsBooleanString()
  activo?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
