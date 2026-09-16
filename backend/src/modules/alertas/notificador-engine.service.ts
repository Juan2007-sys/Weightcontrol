import { Injectable, Logger } from '@nestjs/common';
import {
  CanalNotificacionStrategy,
  NotificationPayload,
} from './strategies/canal-notificacion.interface.js';
import { SistemaNotificadorStrategy } from './strategies/sistema-notificador.strategy.js';
import { EmailNotificadorStrategy } from './strategies/email-notificador.strategy.js';
import { AuditLogNotificadorStrategy } from './strategies/audit-log-notificador.strategy.js';

@Injectable()
export class NotificadorEngineService {
  private readonly logger = new Logger(NotificadorEngineService.name);
  private readonly strategies: CanalNotificacionStrategy[];

  constructor(
    sistemaStrategy: SistemaNotificadorStrategy,
    emailStrategy: EmailNotificadorStrategy,
    auditLogStrategy: AuditLogNotificadorStrategy,
  ) {
    this.strategies = [sistemaStrategy, emailStrategy, auditLogStrategy];
  }

  async dispatch(payload: NotificationPayload): Promise<string[]> {
    const executedChannels: string[] = [];

    for (const strategy of this.strategies) {
      try {
        const success = await strategy.sendNotification(payload);
        if (success) {
          executedChannels.push(strategy.getCanalName());
        }
      } catch (error) {
        this.logger.error(
          `Error despachando notificación en canal ${strategy.getCanalName()}: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    return executedChannels;
  }
}
