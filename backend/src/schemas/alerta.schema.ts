import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Instrumento } from './instrumento.schema.js';

export type AlertaDocument = Alerta & Document;

export enum NivelAlerta {
  PREVENTIVA = 'PREVENTIVA', // 30 a 16 días
  MODERADA = 'MODERADA',     // 15 a 6 días
  CRITICA = 'CRITICA',       // 5 a 0 días
  VENCIDA = 'VENCIDA',       // < 0 días (Vencido)
}

@Schema({ timestamps: true, collection: 'alertas' })
export class Alerta {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Instrumento',
    required: true,
    index: true,
  })
  instrumento: Instrumento | string;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  serial: string;

  @Prop({ required: true, trim: true })
  marca: string;

  @Prop({ required: true, trim: true })
  modelo: string;

  @Prop({ required: true })
  fechaProximaCalibracion: Date;

  @Prop({ required: true })
  diasRestantes: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(NivelAlerta),
    index: true,
  })
  nivelCriticidad: NivelAlerta;

  @Prop({ required: true, trim: true })
  mensaje: string;

  @Prop({ type: [String], default: [] })
  canalesNotificados: string[];

  @Prop({ default: false, index: true })
  leida: boolean;

  @Prop({ default: true })
  despachada: boolean;
}

export const AlertaSchema = SchemaFactory.createForClass(Alerta);

AlertaSchema.index({ serial: 1, nivelCriticidad: 1, createdAt: -1 });
