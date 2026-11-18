import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { IntegracionesController } from './integraciones.controller.js';
import { IntegracionesService } from './integraciones.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [IntegracionesController],
  providers: [IntegracionesService],
  exports: [IntegracionesService],
})
export class IntegracionesModule {}
