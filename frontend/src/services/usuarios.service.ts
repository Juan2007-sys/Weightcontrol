import { apiClient } from './apiClient';

export interface UserItem {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'TECNICO' | 'INSTITUCION_ACREDITACION' | 'AUDITOR' | 'SIC' | 'CIUDADANO';
  documentoIdentidad?: string;
  numeroRegistroSIMEL?: string;
  tarjetaProfesional?: string;
  entidad?: string;
  telefono?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  nombre: string;
  email: string;
  password: string;
  rol: 'ADMIN' | 'TECNICO' | 'INSTITUCION_ACREDITACION' | 'AUDITOR' | 'SIC' | 'CIUDADANO';
  documentoIdentidad?: string;
  numeroRegistroSIMEL?: string;
  tarjetaProfesional?: string;
  entidad?: string;
  telefono?: string;
  activo?: boolean;
}

export interface UpdateUserData {
  nombre?: string;
  email?: string;
  password?: string;
  rol?: 'ADMIN' | 'TECNICO' | 'INSTITUCION_ACREDITACION' | 'AUDITOR' | 'SIC' | 'CIUDADANO';
  documentoIdentidad?: string;
  numeroRegistroSIMEL?: string;
  tarjetaProfesional?: string;
  entidad?: string;
  telefono?: string;
  activo?: boolean;
}

export interface QueryUsuariosParams {
  search?: string;
  rol?: string;
  activo?: boolean | string;
  page?: number;
  limit?: number;
}

export const usuariosService = {
  async getAll(params?: QueryUsuariosParams): Promise<{
    items: UserItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return apiClient.get<{
      items: UserItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/usuarios', params);
  },

  async getById(id: string): Promise<UserItem> {
    return apiClient.get<UserItem>(`/usuarios/${id}`);
  },

  async create(data: CreateUserData): Promise<UserItem> {
    return apiClient.post<UserItem>('/usuarios', data);
  },

  async update(id: string, data: UpdateUserData): Promise<UserItem> {
    return apiClient.put<UserItem>(`/usuarios/${id}`, data);
  },

  async changeStatus(id: string, activo: boolean, motivo?: string): Promise<UserItem> {
    return apiClient.patch<UserItem>(`/usuarios/${id}/status`, { activo, motivo });
  },

  async delete(id: string): Promise<{ message: string; id: string }> {
    return apiClient.delete<{ message: string; id: string }>(`/usuarios/${id}`);
  },
};
