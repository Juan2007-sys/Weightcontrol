import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ConfiguracionController } from './configuracion.controller.js';
import { ConfiguracionService } from './configuracion.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
