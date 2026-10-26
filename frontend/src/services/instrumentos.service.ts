import { apiClient } from './apiClient';
import type { BackendInstrumento } from './mappers';
import { mapBackendInstrumentToFrontend } from './mappers';
import type { MetrologicalInstrument } from '../types/metrology';

export interface PaginatedResponse<T> {
  data: T[];
  /** El backend devuelve el total en `meta.total`; `total` se mantiene por compatibilidad. */
  meta?: { total: number; page?: number; limit?: number; totalPages?: number };
  total?: number;
  page?: number;
  totalPages?: number;
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
  tipo: 'Bascula' | 'Pesa' | 'Dinamometro' | string;
  categoriaExactitud: 'Clase I' | 'Clase II' | 'Clase III' | 'Clase IIII' | string;
  capacidadMaxima: number;
  capacidadMinima?: number;
  unidadMedida: 'g' | 'kg' | 't' | 'lb' | 'N' | 'kN' | string;
  divisionEscala?: number;
  codigoPrecintoSIMEL?: string;
  evidenciasFotograficas?: {
    fotoEquipo: string;
    fotoPrecinto: string;
    fotoUbicacion: string;
  };
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

export interface PublicUltimoCertificadoDto {
  numeroCertificado: string;
  codigoFolio?: string;
  fechaCalibracion: string;
  resultado: string;
  pdfUrl?: string;
  hashSha256?: string;
  laboratorioAcreditado?: string;
  /** true si el certificado fue anulado por el flujo de correccion (HU-04). */
  anulado?: boolean;
  reemplazadoPorNumero?: string;
}

export interface PublicVerificationDto {
  serial: string;
  marca: string;
  modelo: string;
  tipo: string;
  categoriaExactitud: string;
  capacidadMaxima: number;
  capacidadMinima: number;
  unidadMedida: string;
  divisionEscala: number;
  estadoMetrologico: string;
  esVigente: boolean;
  fechaUltimaCalibracion: string;
  fechaProximaCalibracion: string;
  codigoPrecintoSIMEL?: string;
  certificadoAnulado?: boolean;
  ultimoCertificado?: PublicUltimoCertificadoDto;
  mensajeVerificacion: string;
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
      total = response.meta?.total ?? response.total ?? rawList.length;
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

  /**
   * Verificacion publica. Con `qr` ({cert, sig}) se valida el QR firmado (HU-05); sin el, es consulta manual.
   */
  verifyPublic: async (serial: string, qr?: { cert?: string; sig?: string }): Promise<PublicVerificationDto> => {
    const params = qr?.cert ? { cert: qr.cert, sig: qr.sig ?? '' } : undefined;
    return apiClient.get<PublicVerificationDto>(`/instrumentos/public/verificar/${encodeURIComponent(serial)}`, params);
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
