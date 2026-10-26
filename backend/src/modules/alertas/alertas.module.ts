import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AlertasController } from './alertas.controller.js';
import { AlertasService } from './alertas.service.js';
import {
  CANALES_NOTIFICACION_TOKEN,
  NotificadorEngineService,
} from './notificador-engine.service.js';
import { SistemaNotificadorStrategy } from './strategies/sistema-notificador.strategy.js';
import { EmailNotificadorStrategy } from './strategies/email-notificador.strategy.js';
import { AuditLogNotificadorStrategy } from './strategies/audit-log-notificador.strategy.js';

// Registro de canales (M2): para un canal nuevo basta su clase y una linea aqui.
export const CANALES_NOTIFICACION = [
  SistemaNotificadorStrategy,
  EmailNotificadorStrategy,
  AuditLogNotificadorStrategy,
];

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AlertasController],
  providers: [
    ...CANALES_NOTIFICACION,
    {
      provide: CANALES_NOTIFICACION_TOKEN,
      useFactory: (...canales: unknown[]) => canales,
      inject: CANALES_NOTIFICACION,
    },
    NotificadorEngineService,
    AlertasService,
  ],
  exports: [AlertasService, NotificadorEngineService],
})
export class AlertasModule {}
