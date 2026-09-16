import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type TrazabilidadEventoDocument = TrazabilidadEvento & Document;

export enum TipoAccionAuditoria {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  GENERATE_CERT = 'GENERATE_CERT',
  CALIBRATE = 'CALIBRATE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_FAILURE = 'AUTH_FAILURE',
  INSPECTION = 'INSPECTION',
}

export enum EntidadAfectada {
  INSTRUMENTO = 'Instrumento',
  CALIBRACION = 'Calibracion',
  CERTIFICADO = 'Certificado',
  USUARIO = 'Usuario',
  CONFIGURACION = 'Configuracion',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'trazabilidad_eventos' })
export class TrazabilidadEvento {
  @Prop({ required: true, default: Date.now, index: true })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario', index: true })
  userId?: Usuario | string;

  @Prop({ trim: true })
  userRole?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(TipoAccionAuditoria),
    index: true,
  })
  actionType: TipoAccionAuditoria;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(EntidadAfectada),
    index: true,
  })
  entityAffected: EntidadAfectada;

  @Prop({ required: true, trim: true, index: true })
  identifier: string; // Serial de instrumento, folio de certificado, ID de usuario, etc.

  @Prop({ type: MongooseSchema.Types.Mixed })
  previousState?: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  newState?: Record<string, any>;

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  descripcion?: string;
}

export const TrazabilidadEventoSchema = SchemaFactory.createForClass(TrazabilidadEvento);

TrazabilidadEventoSchema.index({ entityAffected: 1, identifier: 1, timestamp: -1 });
