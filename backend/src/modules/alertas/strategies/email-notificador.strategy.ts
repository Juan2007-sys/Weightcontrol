import { Injectable, Logger } from '@nestjs/common';
import {
  CanalNotificacionStrategy,
  NotificationPayload,
} from './canal-notificacion.interface.js';

export interface DirectEmailRequest {
  to: string[];
  subject: string;
  text: string;
}

@Injectable()
export class EmailNotificadorStrategy implements CanalNotificacionStrategy {
  private readonly logger = new Logger(EmailNotificadorStrategy.name);

  getCanalName(): string {
    return 'EMAIL';
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    const asunto = `[ALERTA METROLÓGICA - ${payload.nivelCriticidad}] Calibración de ${payload.serial}`;
    const destinatario =
      payload.destinatarioEmail || 'responsable.metrologia@empresa.com';

    await this.sendDirectEmail({
      to: [destinatario],
      subject: asunto,
      text: `${payload.mensaje} | Serial: ${payload.serial} | Fecha: ${new Date(payload.fechaProximaCalibracion).toISOString().split('T')[0]}`,
    });
    return true;
  }

  /**
   * HU-14: Envía correo vía webhook/Resend si hay configuración activa, o registra en log en entorno local.
   * Lanza error explícito si el servidor de correo falla para que AlertasService registre el fallo.
   */
  async sendDirectEmail(req: DirectEmailRequest): Promise<void> {
    if (req.to.length === 0) {
      throw new Error('No hay destinatarios configurados para el envío de correo.');
    }

    if (process.env.EMAIL_TRANSPORT_MODE === 'error') {
      throw new Error('Falla simulada del servidor de correo (EMAIL_TRANSPORT_MODE=error).');
    }

    const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EMAIL_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          to: req.to,
          subject: req.subject,
          text: req.text,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `El servidor de correo respondió HTTP ${response.status} ${response.statusText}`,
        );
      }
      return;
    }

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      const from =
        process.env.EMAIL_FROM?.trim() || 'WeightControl <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from,
          to: req.to,
          subject: req.subject,
          text: req.text,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Resend API respondió HTTP ${response.status}: ${body || response.statusText}`,
        );
      }
      return;
    }

    // Modo local sin proveedor externo configurado
    this.logger.log(
      `[Email] Para: ${req.to.join(', ')} | Asunto: "${req.subject}" | ${req.text}`,
    );
  }
}
