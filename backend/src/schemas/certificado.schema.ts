import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Instrumento } from './instrumento.schema.js';
import { Calibracion } from './calibracion.schema.js';
import { Usuario } from './usuario.schema.js';

export type CertificadoDocument = Certificado & Document;

export enum TipoCertificado {
  CALIBRACION = 'Calibracion',
  INSPECCION = 'Inspeccion',
  CONFORMIDAD_METROLOGICA = 'ConformidadMetrologica',
}

export enum EstadoCertificado {
  VALIDO = 'Valido',
  ANULADO = 'Anulado',
  EXPIRADO = 'Expirado',
}

@Schema({ _id: false })
export class FirmaDigitalInfo {
  @Prop({ required: true, trim: true })
  firmante: string;

  @Prop({ required: true, trim: true })
  cargo: string;

  @Prop({ required: true, default: Date.now })
  fechaFirma: Date;

  @Prop({ required: true, trim: true })
  hashFirma: string;
}

@Schema({ timestamps: true, collection: 'certificados' })
export class Certificado {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  codigoFolio: string; // UUID o código de verificación único

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Instrumento',
    required: true,
    index: true,
  })
  instrumento: Instrumento | string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Calibracion',
    required: true,
    index: true,
  })
  calibracion: Calibracion | string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  })
  emitidoPor: Usuario | string;

  @Prop({
    required: true,
    enum: Object.values(TipoCertificado),
    default: TipoCertificado.CONFORMIDAD_METROLOGICA,
  })
  tipoCertificado: TipoCertificado;

  @Prop({ required: true, default: Date.now })
  fechaEmision: Date;

  @Prop({ required: true, index: true })
  fechaVencimiento: Date;

  @Prop({ trim: true })
  codigoQR?: string;

  @Prop({ type: FirmaDigitalInfo })
  firmaDigital?: FirmaDigitalInfo;

  @Prop({ type: [String], default: [] })
  sellosAplicados: string[]; // Ej: ConMarcaAgua, ConFirmaDigital, SelloSIMEL (Patrón Decorator)

  @Prop({
    required: true,
    enum: Object.values(EstadoCertificado),
    default: EstadoCertificado.VALIDO,
    index: true,
  })
  estado: EstadoCertificado;

  @Prop({ trim: true })
  motivoAnulacion?: string;

  @Prop({ trim: true })
  pdfUrl?: string;
}

export const CertificadoSchema = SchemaFactory.createForClass(Certificado);

CertificadoSchema.index({ codigoFolio: 1, estado: 1 });
