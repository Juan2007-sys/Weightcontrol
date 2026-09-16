import { apiClient } from './apiClient';

export interface AlertaStats {
  total: number;
  noLeidas: number;
  criticas: number;
  advertencias: number;
  informativas: number;
}

export interface BackendAlerta {
  id: string;
  tipo: string;
  nivel: 'CRITICA' | 'ADVERTENCIA' | 'INFORMATIVA' | string;
  titulo: string;
  mensaje: string;
  instrumento?: any;
  leida: boolean;
  createdAt: string;
}

export const alertasService = {
  getAll: async (params?: { page?: number; limit?: number; nivel?: string; leida?: boolean }): Promise<{
    data: BackendAlerta[];
    total: number;
  }> => {
    const res = await apiClient.get<any>('/alertas', params);
    if (Array.isArray(res)) {
      return { data: res, total: res.length };
    }
    return { data: res?.data || [], total: res?.total || 0 };
  },

  getStats: async (): Promise<AlertaStats> => {
    return apiClient.get<AlertaStats>('/alertas/stats/summary');
  },

  scan: async (): Promise<{ totalEscaneados: number; alertasGeneradas: number; alertas: BackendAlerta[] }> => {
    return apiClient.post('/alertas/scan');
  },

  markAsRead: async (id: string): Promise<BackendAlerta> => {
    return apiClient.patch<BackendAlerta>(`/alertas/${id}/read`);
  },

  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    return apiClient.patch<{ modifiedCount: number }>('/alertas/read-all');
  },
};
