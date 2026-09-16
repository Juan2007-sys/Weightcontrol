import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service.js';
import {
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../../schemas/trazabilidad-evento.schema.js';
import {
  CanalNotificacionStrategy,
  NotificationPayload,
} from './canal-notificacion.interface.js';

@Injectable()
export class AuditLogNotificadorStrategy implements CanalNotificacionStrategy {
  constructor(private readonly auditService: AuditService) {}

  getCanalName(): string {
    return 'AUDIT_LOG';
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    await this.auditService.logEvent({
      actionType: TipoAccionAuditoria.STATUS_CHANGE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: payload.serial,
      newState: {
        nivelCriticidad: payload.nivelCriticidad,
        diasRestantes: payload.diasRestantes,
        fechaProximaCalibracion: payload.fechaProximaCalibracion,
      },
      descripcion: `Alerta generada y notificada para instrumento serial ${payload.serial}: ${payload.mensaje}`,
    });
    return true;
  }
}
