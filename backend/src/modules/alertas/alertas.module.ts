import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AlertasController } from './alertas.controller.js';
import { AlertasService } from './alertas.service.js';
import { NotificadorEngineService } from './notificador-engine.service.js';
import { SistemaNotificadorStrategy } from './strategies/sistema-notificador.strategy.js';
import { EmailNotificadorStrategy } from './strategies/email-notificador.strategy.js';
import { AuditLogNotificadorStrategy } from './strategies/audit-log-notificador.strategy.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [AlertasController],
  providers: [
    SistemaNotificadorStrategy,
    EmailNotificadorStrategy,
    AuditLogNotificadorStrategy,
    NotificadorEngineService,
    AlertasService,
  ],
  exports: [AlertasService, NotificadorEngineService],
})
export class AlertasModule {}
