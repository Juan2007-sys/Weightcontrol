import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CanalNotificacionStrategy,
  NotificationPayload,
} from './strategies/canal-notificacion.interface.js';

/**
 * Token de inyeccion (M2) con los canales de notificacion. El modulo lo construye
 * desde `CANALES_NOTIFICACION` (alertas.module.ts): un canal nuevo = su clase + una linea.
 */
export const CANALES_NOTIFICACION_TOKEN = 'CANALES_NOTIFICACION';

@Injectable()
export class NotificadorEngineService {
  private readonly logger = new Logger(NotificadorEngineService.name);

  constructor(
    @Inject(CANALES_NOTIFICACION_TOKEN)
    private readonly strategies: CanalNotificacionStrategy[],
  ) {}

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
