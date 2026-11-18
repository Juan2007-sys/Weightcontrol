import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type ConexionExternaDocument = ConexionExterna & Document;

@Schema({ timestamps: true, collection: 'conexiones_externas' })
export class ConexionExterna {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  codigoSistema: string;

  @Prop({ required: true, trim: true })
  endpointUrl: string;

  @Prop({ required: true, select: false })
  apiKeyHash: string;

  @Prop({ default: true, index: true })
  activo: boolean;

  @Prop({ type: [String], default: ['SINCRONIZAR'] })
  permisos: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario' })
  creadoPor?: Usuario | string;
}

export const ConexionExternaSchema =
  SchemaFactory.createForClass(ConexionExterna);
