import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '../../schemas/usuario.schema.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
