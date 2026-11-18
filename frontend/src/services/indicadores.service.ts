import { apiClient } from './apiClient';

export interface PanelIndicadoresData {
  equipos: {
    total: number;
    activos: number;
    inactivos: number;
    porEstado: {
      Vigente: number;
      'Por vencer': number;
      Vencido: number;
    };
    porTipo: Array<{ tipo: string; cantidad: number }>;
  };
  calibraciones: {
    realizadas: number;
    pendientes: number;
    vencidas: number;
  };
  certificados: {
    emitidos: number;
    vigentes: number;
    anulados: number;
  };
  filtrosAplicados: {
    fechaInicio: string | null;
    fechaFin: string | null;
    tipoEquipo: string | null;
  };
}

export const indicadoresService = {
  getPanel: async (params?: {
    fechaInicio?: string;
    fechaFin?: string;
    tipoEquipo?: string;
  }): Promise<PanelIndicadoresData> => {
    return apiClient.get<PanelIndicadoresData>('/indicadores', params);
  },
};
