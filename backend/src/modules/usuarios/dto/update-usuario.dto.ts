import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { RolUsuario } from '../../../schemas/usuario.schema.js';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  nombre?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres si se especifica.' })
  password?: string;

  @IsOptional()
  @IsEnum(RolUsuario, {
    message: `El rol debe ser uno de los siguientes: ${Object.values(RolUsuario).join(', ')}`,
  })
  rol?: RolUsuario;

  @IsOptional()
  @IsString()
  documentoIdentidad?: string;

  @IsOptional()
  @IsString()
  numeroRegistroSIMEL?: string;

  @IsOptional()
  @IsString()
  tarjetaProfesional?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
