import { apiClient } from './apiClient';

/** M3: parametros maestros editables en caliente (sin redesplegar). */
export const configuracionService = {
  getUmbralAlerta: async (): Promise<number> => {
    const r = await apiClient.get<{ umbralDias: number }>('/configuracion/alertas');
    return r.umbralDias;
  },

  setUmbralAlerta: async (umbralDias: number): Promise<number> => {
    const r = await apiClient.put<{ umbralDias: number }>('/configuracion/alertas', { umbralDias });
    return r.umbralDias;
  },

  getDestinatariosEmail: async (): Promise<string[]> => {
    const r = await apiClient.get<{ destinatarios: string[] }>('/configuracion/notificaciones/destinatarios');
    return r.destinatarios ?? [];
  },

  setDestinatariosEmail: async (destinatarios: string[]): Promise<string[]> => {
    const r = await apiClient.put<{ destinatarios: string[] }>('/configuracion/notificaciones/destinatarios', {
      destinatarios,
    });
    return r.destinatarios ?? [];
  },
};
