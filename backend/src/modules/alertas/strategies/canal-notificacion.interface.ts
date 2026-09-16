import { NivelAlerta } from '../../../schemas/alerta.schema.js';

export interface NotificationPayload {
  alertaId?: string;
  instrumentoId: string;
  serial: string;
  marca: string;
  modelo: string;
  fechaProximaCalibracion: Date;
  diasRestantes: number;
  nivelCriticidad: NivelAlerta;
  mensaje: string;
  destinatarioEmail?: string;
}

export interface CanalNotificacionStrategy {
  getCanalName(): string;
  sendNotification(payload: NotificationPayload): Promise<boolean>;
}
