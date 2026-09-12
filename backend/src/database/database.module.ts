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
} from '../schemas/index.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Instrumento.name, schema: InstrumentoSchema },
      { name: Calibracion.name, schema: CalibracionSchema },
      { name: Certificado.name, schema: CertificadoSchema },
      { name: TrazabilidadEvento.name, schema: TrazabilidadEventoSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
