import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InstrumentosController } from './instrumentos.controller.js';
import { InstrumentosService } from './instrumentos.service.js';
import { BasculaValidator } from './validators/bascula.validator.js';
import { PesaValidator } from './validators/pesa.validator.js';
import { DinamometroValidator } from './validators/dinamometro.validator.js';
import {
  INSTRUMENTO_VALIDATORS,
  ValidationEngineService,
} from './validators/validation-engine.service.js';

// Registro de validators (M1): para un tipo nuevo basta su clase y una linea aqui.
export const INSTRUMENTO_VALIDATOR_CLASSES = [
  BasculaValidator,
  PesaValidator,
  DinamometroValidator,
];

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [InstrumentosController],
  providers: [
    ...INSTRUMENTO_VALIDATOR_CLASSES,
    {
      provide: INSTRUMENTO_VALIDATORS,
      useFactory: (...validators: unknown[]) => validators,
      inject: INSTRUMENTO_VALIDATOR_CLASSES,
    },
    ValidationEngineService,
    InstrumentosService,
  ],
  exports: [InstrumentosService, ValidationEngineService],
})
export class InstrumentosModule {}
