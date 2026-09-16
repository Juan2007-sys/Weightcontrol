import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InstrumentosModule } from '../instrumentos/instrumentos.module.js';
import { CalibracionesController } from './calibraciones.controller.js';
import { CalibracionesService } from './calibraciones.service.js';

@Module({
  imports: [DatabaseModule, AuditModule, InstrumentosModule],
  controllers: [CalibracionesController],
  providers: [CalibracionesService],
  exports: [CalibracionesService],
})
export class CalibracionesModule {}
