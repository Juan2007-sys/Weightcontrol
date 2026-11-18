import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SyncLogDocument = SyncLog & Document;

export enum EstadoSincronizacion {
  EXITOSO = 'EXITOSO',
  DUPLICADO = 'DUPLICADO',
  ERROR_VALIDACION = 'ERROR_VALIDACION',
  ERROR_COMUNICACION = 'ERROR_COMUNICACION',
  NO_AUTORIZADO = 'NO_AUTORIZADO',
}

@Schema({ timestamps: true, collection: 'sync_logs' })
export class SyncLog {
  @Prop({ required: true, uppercase: true, trim: true, index: true })
  sistemaCodigo: string;

  @Prop({ required: true, enum: ['ENTRANTE', 'SALIENTE'], default: 'ENTRANTE' })
  direccion: 'ENTRANTE' | 'SALIENTE';

  @Prop({ required: true, trim: true })
  endpoint: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(EstadoSincronizacion),
    index: true,
  })
  estado: EstadoSincronizacion;

  @Prop({ required: true })
  codigoHttp: number;

  @Prop({ type: Object })
  solicitudResumen?: Record<string, any>;

  @Prop({ type: Object })
  respuestaResumen?: Record<string, any>;

  @Prop({ trim: true })
  errorMensaje?: string;
}

export const SyncLogSchema = SchemaFactory.createForClass(SyncLog);
SyncLogSchema.index({ createdAt: -1 });
