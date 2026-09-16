import { apiClient } from './apiClient';
import type { BackendInstrumento } from './mappers';
import { mapBackendInstrumentToFrontend } from './mappers';
import type { MetrologicalInstrument } from '../types/metrology';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InstrumentoStats {
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
}

export interface CreateInstrumentoPayload {
  serial: string;
  marca: string;
  modelo: string;
  tipo: 'Bascula' | 'Pesa' | 'Dinamometro';
  categoriaExactitud: 'Clase I' | 'Clase II' | 'Clase III' | 'Clase IIII';
  capacidadMaxima: number;
  unidadMedida: 'g' | 'kg' | 't' | 'lb' | 'N' | 'kN';
  divisionEscala?: number;
  codigoPrecintoSIMEL?: string;
  propietario?: {
    nombreRazonSocial: string;
    nitRut: string;
    direccion?: string;
    ciudad?: string;
    departamento?: string;
  };
  ubicacionFisica?: string;
  fechaUltimaCalibracion: string;
  fechaProximaCalibracion: string;
}

export const instrumentosService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    serial?: string;
    estado?: string;
    tipo?: string;
  }): Promise<{ items: MetrologicalInstrument[]; total: number; raw: BackendInstrumento[] }> => {
    const response = await apiClient.get<PaginatedResponse<BackendInstrumento> | BackendInstrumento[]>('/instrumentos', params);

    let rawList: BackendInstrumento[] = [];
    let total = 0;

    if (Array.isArray(response)) {
      rawList = response;
      total = response.length;
    } else if (response && Array.isArray(response.data)) {
      rawList = response.data;
      total = response.total;
    }

    const items = rawList.map(mapBackendInstrumentToFrontend);
    return { items, total, raw: rawList };
  },

  getStats: async (): Promise<InstrumentoStats> => {
    return apiClient.get<InstrumentoStats>('/instrumentos/stats/summary');
  },

  getById: async (id: string): Promise<MetrologicalInstrument> => {
    const raw = await apiClient.get<BackendInstrumento>(`/instrumentos/${id}`);
    return mapBackendInstrumentToFrontend(raw);
  },

  getBySerial: async (serial: string): Promise<MetrologicalInstrument> => {
    const raw = await apiClient.get<BackendInstrumento>(`/instrumentos/serial/${encodeURIComponent(serial)}`);
    return mapBackendInstrumentToFrontend(raw);
  },

  create: async (data: CreateInstrumentoPayload): Promise<BackendInstrumento> => {
    return apiClient.post<BackendInstrumento>('/instrumentos', data);
  },

  update: async (id: string, data: Partial<CreateInstrumentoPayload>): Promise<BackendInstrumento> => {
    return apiClient.put<BackendInstrumento>(`/instrumentos/${id}`, data);
  },

  delete: async (id: string): Promise<{ message: string; id: string }> => {
    return apiClient.delete<{ message: string; id: string }>(`/instrumentos/${id}`);
  },
};
