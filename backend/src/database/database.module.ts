import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Usuario,
  UsuarioSchema,
  Instrumento,
  InstrumentoSchema,
  Calibracion,
  CalibracionSchema,
  Certificado,
  CertificadoSchema,
  TrazabilidadEvento,
  TrazabilidadEventoSchema,
  Alerta,
  AlertaSchema,
  Configuracion,
  ConfiguracionSchema,
  NotificacionEmail,
  NotificacionEmailSchema,
  ConexionExterna,
  ConexionExternaSchema,
  SyncLog,
  SyncLogSchema,
} from '../schemas/index.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Instrumento.name, schema: InstrumentoSchema },
      { name: Calibracion.name, schema: CalibracionSchema },
      { name: Certificado.name, schema: CertificadoSchema },
      { name: TrazabilidadEvento.name, schema: TrazabilidadEventoSchema },
      { name: Alerta.name, schema: AlertaSchema },
      { name: Configuracion.name, schema: ConfiguracionSchema },
      { name: NotificacionEmail.name, schema: NotificacionEmailSchema },
      { name: ConexionExterna.name, schema: ConexionExternaSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
