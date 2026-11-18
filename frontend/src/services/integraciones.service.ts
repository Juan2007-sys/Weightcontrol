import { apiClient } from './apiClient';

export interface ConexionExternaItem {
  _id: string;
  nombre: string;
  codigoSistema: string;
  endpointUrl: string;
  activo: boolean;
  permisos: string[];
  createdAt?: string;
}

export interface SyncLogItem {
  _id: string;
  sistemaCodigo: string;
  direccion: 'ENTRANTE' | 'SALIENTE';
  endpoint: string;
  estado: string;
  codigoHttp: number;
  errorMensaje?: string;
  createdAt: string;
}

export const integracionesService = {
  getConexiones: async (): Promise<ConexionExternaItem[]> => {
    return apiClient.get('/integraciones/conexiones');
  },

  crearConexion: async (data: {
    nombre: string;
    codigoSistema: string;
    endpointUrl: string;
  }): Promise<ConexionExternaItem & { id: string; apiKey: string }> => {
    return apiClient.post('/integraciones/conexiones', data);
  },

  cambiarEstado: async (id: string, activo: boolean): Promise<ConexionExternaItem> => {
    return apiClient.patch(`/integraciones/conexiones/${id}/estado`, { activo });
  },

  getHistorial: async (limit = 50): Promise<SyncLogItem[]> => {
    return apiClient.get('/integraciones/historial', { limit });
  },
};
