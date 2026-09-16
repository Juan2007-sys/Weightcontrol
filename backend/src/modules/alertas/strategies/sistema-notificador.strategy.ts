import { Injectable, Logger } from '@nestjs/common';
import {
  CanalNotificacionStrategy,
  NotificationPayload,
} from './canal-notificacion.interface.js';

@Injectable()
export class SistemaNotificadorStrategy implements CanalNotificacionStrategy {
  private readonly logger = new Logger(SistemaNotificadorStrategy.name);

  getCanalName(): string {
    return 'SISTEMA';
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(
      `[Notificación In-App/Sistema] [${payload.nivelCriticidad}] Alerta para equipo ${payload.serial} (${payload.marca}): ${payload.mensaje}`,
    );
    return true;
  }
}
