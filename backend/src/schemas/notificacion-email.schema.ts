import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificacionEmailDocument = NotificacionEmail & Document;

export enum TipoEventoNotificacion {
  PROXIMO_VENCIMIENTO = 'PROXIMO_VENCIMIENTO',
  CALIBRACION_VENCIDA = 'CALIBRACION_VENCIDA',
  NUEVO_CERTIFICADO = 'NUEVO_CERTIFICADO',
}

export enum EstadoEnvioNotificacion {
  ENVIADO = 'ENVIADO',
  ERROR = 'ERROR',
}

@Schema({ timestamps: true, collection: 'notificaciones_email' })
export class NotificacionEmail {
  @Prop({
    type: String,
    required: true,
    enum: Object.values(TipoEventoNotificacion),
    index: true,
  })
  evento: TipoEventoNotificacion;

  @Prop({ required: true, unique: true, trim: true, index: true })
  claveDeduplicacion: string;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  serial: string;

  @Prop({ required: true })
  fechaEvento: Date;

  @Prop({ type: [String], required: true, default: [] })
  destinatarios: string[];

  @Prop({ required: true, trim: true })
  asunto: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(EstadoEnvioNotificacion),
    index: true,
  })
  estadoEnvio: EstadoEnvioNotificacion;

  @Prop({ trim: true })
  errorMensaje?: string;
}

export const NotificacionEmailSchema =
  SchemaFactory.createForClass(NotificacionEmail);
NotificacionEmailSchema.index({ createdAt: -1 });
