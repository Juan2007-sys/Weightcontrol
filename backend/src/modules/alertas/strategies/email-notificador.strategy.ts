import { Injectable, Logger } from '@nestjs/common';
import {
  CanalNotificacionStrategy,
  NotificationPayload,
} from './canal-notificacion.interface.js';

@Injectable()
export class EmailNotificadorStrategy implements CanalNotificacionStrategy {
  private readonly logger = new Logger(EmailNotificadorStrategy.name);

  getCanalName(): string {
    return 'EMAIL';
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    const asunto = `[ALERTA METROLÓGICA - ${payload.nivelCriticidad}] Calibración de ${payload.serial}`;
    const destinatario = payload.destinatarioEmail || 'responsable.metrologia@empresa.com';

    this.logger.log(
      `[Notificación Email] Despachando a: ${destinatario} | Asunto: "${asunto}" | Días restantes: ${payload.diasRestantes}`,
    );
    // Simulación de envío SMTP
    return true;
  }
}
