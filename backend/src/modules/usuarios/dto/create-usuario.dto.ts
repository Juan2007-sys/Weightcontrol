import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { RolUsuario } from '../../../schemas/usuario.schema.js';

export class CreateUsuarioDto {
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  nombre: string;

  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'El formato del correo electrónico es inválido.' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @IsNotEmpty({ message: 'El rol de usuario es obligatorio.' })
  @IsEnum(RolUsuario, {
    message: `El rol debe ser uno de los siguientes: ${Object.values(RolUsuario).join(', ')}`,
  })
  rol: RolUsuario;

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
