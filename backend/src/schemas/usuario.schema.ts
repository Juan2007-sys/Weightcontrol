import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UsuarioDocument = Usuario & Document;

export enum RolUsuario {
  ADMIN = 'ADMIN',
  TECNICO = 'TECNICO',
  INSTITUCION_ACREDITACION = 'INSTITUCION_ACREDITACION',
  AUDITOR = 'AUDITOR',
  SIC = 'SIC',
  CIUDADANO = 'CIUDADANO',
}

@Schema({ timestamps: true, collection: 'usuarios' })
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(RolUsuario),
    default: RolUsuario.CIUDADANO,
    index: true,
  })
  rol: RolUsuario;

  @Prop({ trim: true })
  documentoIdentidad?: string;

  @Prop({ trim: true })
  numeroRegistroSIMEL?: string;

  @Prop({ trim: true })
  tarjetaProfesional?: string;

  @Prop({ trim: true })
  entidad?: string;

  @Prop({ trim: true })
  telefono?: string;

  @Prop({ default: true })
  activo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
