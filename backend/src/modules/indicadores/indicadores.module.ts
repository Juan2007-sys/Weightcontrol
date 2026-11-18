import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { IndicadoresController } from './indicadores.controller.js';
import { IndicadoresService } from './indicadores.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [IndicadoresController],
  providers: [IndicadoresService],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
