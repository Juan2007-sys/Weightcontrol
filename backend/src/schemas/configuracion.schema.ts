import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type ConfiguracionDocument = Configuracion & Document;

/** Parametros maestros editables en caliente (M3), p. ej. el umbral de alerta por vencimiento. */
@Schema({ timestamps: true, collection: 'configuracion' })
export class Configuracion {
  @Prop({ required: true, unique: true, trim: true })
  clave: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  valor: unknown;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario' })
  actualizadoPor?: Usuario | string;
}

export const ConfiguracionSchema = SchemaFactory.createForClass(Configuracion);
