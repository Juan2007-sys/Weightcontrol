import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '../../../schemas/usuario.schema.js';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es requerido.' })
  nombre: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsOptional()
  @IsEnum(RolUsuario, {
    message: `El rol debe ser uno de: ${Object.values(RolUsuario).join(', ')}`,
  })
  rol?: RolUsuario;

  @IsOptional()
  @IsString({ message: 'El documento de identidad debe ser una cadena de texto.' })
  documentoIdentidad?: string;

  @IsOptional()
  @IsString({ message: 'El número de registro SIMEL debe ser una cadena de texto.' })
  numeroRegistroSIMEL?: string;

  @IsOptional()
  @IsString({ message: 'La tarjeta profesional debe ser una cadena de texto.' })
  tarjetaProfesional?: string;

  @IsOptional()
  @IsString({ message: 'La entidad debe ser una cadena de texto.' })
  entidad?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto.' })
  telefono?: string;
}
