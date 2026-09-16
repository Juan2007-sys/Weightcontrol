import { RolUsuario } from '../../../schemas/usuario.schema.js';

export interface UserResponseDto {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  documentoIdentidad?: string;
  numeroRegistroSIMEL?: string;
  tarjetaProfesional?: string;
  entidad?: string;
  telefono?: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: UserResponseDto;
}
