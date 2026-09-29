import { apiClient } from './apiClient';

export interface PatronCalibracion {
  codigoPatron: string;
  descripcion: string;
  certificadoTrazabilidad: string;
  fechaVencimientoPatron: string;
}

export interface PuntoEnsayoEMP {
  cargaNominal: number;
  errorEncontrado: number;
  errorMaximoPermitido: number;
  cumple: boolean;
}

export interface CreateCalibracionPayload {
  instrumentoId: string;
  laboratorioAcreditado: string;
  numeroCertificado: string;
  fechaCalibracion: string;
  fechaProximaCalibracion: string;
  resultado: 'Conforme' | 'No Conforme' | string;
  codigoPrecintoSIMEL?: string;
  patronesUtilizados: PatronCalibracion[];
  erroresMaximosPermitidos: PuntoEnsayoEMP[];
  incertidumbreExpandida?: string;
  observaciones?: string;
}

export interface BackendCalibracion {
  id?: string;
  _id?: string;
  instrumento: any;
  tecnico?: any;
  laboratorioAcreditado: string;
  numeroCertificado: string;
  codigoFolio?: string;
  bloqueadoInmutable?: boolean;
  fechaCalibracion: string | Date;
  fechaProximaCalibracion: string | Date;
  resultado: 'Conforme' | 'No Conforme' | string;
  codigoPrecintoSIMEL?: string;
  patronesUtilizados?: PatronCalibracion[];
  erroresMaximosPermitidos?: PuntoEnsayoEMP[];
  observaciones?: string;
  incertidumbreExpandida?: string;
  pdfUrl?: string;
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

  create: async (data: CreateCalibracionPayload): Promise<BackendCalibracion> => {
    return apiClient.post<BackendCalibracion>('/calibraciones', data);
  },

  downloadPdf: async (idOrFolio: string): Promise<Blob> => {
    return apiClient.getBlob(`/calibraciones/${idOrFolio}/pdf`);
  },

  triggerPdfDownload: async (idOrFolio: string, customFilename?: string): Promise<void> => {
    const blob = await apiClient.getBlob(`/calibraciones/${idOrFolio}/pdf`);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = customFilename || `Certificado-Calibracion-${idOrFolio}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },
};
