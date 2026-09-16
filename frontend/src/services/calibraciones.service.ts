import { apiClient } from './apiClient';

export interface BackendCalibracion {
  id?: string;
  _id?: string;
  instrumento: any;
  tecnico?: any;
  laboratorioAcreditado: string;
  numeroCertificado: string;
  fechaCalibracion: string | Date;
  fechaProximaCalibracion: string | Date;
  resultado: 'Conforme' | 'No Conforme' | string;
  codigoPrecintoSIMEL?: string;
  observaciones?: string;
  incertidumbreExpandida?: string;
  createdAt?: string;
}

export const calibracionesService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<{
    data: BackendCalibracion[];
    total: number;
  }> => {
    const res = await apiClient.get<any>('/calibraciones', params);
    if (Array.isArray(res)) {
      return { data: res, total: res.length };
    }
    return { data: res?.data || [], total: res?.total || 0 };
  },

  getByInstrumento: async (instrumentoId: string): Promise<BackendCalibracion[]> => {
    return apiClient.get<BackendCalibracion[]>(`/calibraciones/instrumento/${instrumentoId}`);
  },

  getById: async (id: string): Promise<BackendCalibracion> => {
    return apiClient.get<BackendCalibracion>(`/calibraciones/${id}`);
  },

  create: async (data: any): Promise<BackendCalibracion> => {
    return apiClient.post<BackendCalibracion>('/calibraciones', data);
  },
};
