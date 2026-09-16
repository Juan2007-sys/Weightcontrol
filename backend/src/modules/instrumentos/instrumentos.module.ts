import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InstrumentosController } from './instrumentos.controller.js';
import { InstrumentosService } from './instrumentos.service.js';
import { BasculaValidator } from './validators/bascula.validator.js';
import { PesaValidator } from './validators/pesa.validator.js';
import { DinamometroValidator } from './validators/dinamometro.validator.js';
import { ValidationEngineService } from './validators/validation-engine.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [InstrumentosController],
  providers: [
    BasculaValidator,
    PesaValidator,
    DinamometroValidator,
    ValidationEngineService,
    InstrumentosService,
  ],
  exports: [InstrumentosService, ValidationEngineService],
})
export class InstrumentosModule {}
