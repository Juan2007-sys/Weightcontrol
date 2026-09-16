import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Instrumento } from './instrumento.schema.js';
import { Usuario } from './usuario.schema.js';

export type CalibracionDocument = Calibracion & Document;

export enum ResultadoCalibracion {
  CONFORME = 'Conforme',
  NO_CONFORME = 'No Conforme',
}

@Schema({ _id: false })
export class PatronUtilizado {
  @Prop({ required: true, trim: true })
  codigoPatron: string;

  @Prop({ required: true, trim: true })
  descripcion: string;

  @Prop({ required: true, trim: true })
  certificadoTrazabilidad: string;

  @Prop({ required: true })
  fechaVencimientoPatron: Date;
}

@Schema({ _id: false })
export class PuntoMedicionError {
  @Prop({ required: true })
  cargaNominal: number;

  @Prop({ required: true })
  errorEncontrado: number;

  @Prop({ required: true })
  errorMaximoPermitido: number;

  @Prop({ required: true })
  cumple: boolean;
}

@Schema({ timestamps: true, collection: 'calibraciones' })
export class Calibracion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Instrumento',
    required: true,
    index: true,
  })
  instrumento: Instrumento | string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  })
  tecnico: Usuario | string;

  @Prop({ required: true, trim: true })
  laboratorioAcreditado: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  numeroCertificado: string;

  @Prop({ required: true })
  fechaCalibracion: Date;

  @Prop({ required: true })
  fechaProximaCalibracion: Date;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ResultadoCalibracion),
  })
  resultado: ResultadoCalibracion;

  @Prop({ trim: true })
  codigoPrecintoSIMEL?: string;

  @Prop({ type: [PatronUtilizado], default: [] })
  patronesUtilizados: PatronUtilizado[];

  @Prop({ type: [PuntoMedicionError], default: [] })
  erroresMaximosPermitidos: PuntoMedicionError[];

  @Prop({ trim: true })
  incertidumbreExpandida?: string;

  @Prop({ trim: true })
  observaciones?: string;

  @Prop({ trim: true })
  archivoInformeUrl?: string;
}

export const CalibracionSchema = SchemaFactory.createForClass(Calibracion);

CalibracionSchema.index({ instrumento: 1, fechaCalibracion: -1 });
