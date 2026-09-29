import { RolUsuario } from '../../../schemas/usuario.schema.js';

export class UsuarioResponseDto {
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
