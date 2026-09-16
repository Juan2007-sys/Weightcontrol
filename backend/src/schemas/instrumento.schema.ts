import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Usuario } from './usuario.schema.js';

export type InstrumentoDocument = Instrumento & Document;

export enum TipoInstrumento {
  BASCULA = 'Bascula',
  PESA = 'Pesa',
  DINAMOMETRO = 'Dinamometro',
}

export enum CategoriaExactitud {
  CLASE_I = 'Clase I',       // Especial
  CLASE_II = 'Clase II',     // Fina
  CLASE_III = 'Clase III',   // Media
  CLASE_IIII = 'Clase IIII', // Ordinaria
}

export enum EstadoInstrumento {
  VIGENTE = 'Vigente',
  POR_VENCER = 'Por vencer',
  VENCIDO = 'Vencido',
}

export enum UnidadMedida {
  G = 'g',
  KG = 'kg',
  T = 't',
  LB = 'lb',
  N = 'N',
  KN = 'kN',
}

@Schema({ _id: false })
export class PropietarioInfo {
  @Prop({ required: true, trim: true })
  nombreRazonSocial: string;

  @Prop({ required: true, trim: true })
  nitRut: string;

  @Prop({ trim: true })
  direccion: string;

  @Prop({ trim: true })
  ciudad: string;

  @Prop({ trim: true })
  departamento: string;
}

@Schema({ timestamps: true, collection: 'instrumentos' })
export class Instrumento {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  serial: string;

  @Prop({ required: true, trim: true })
  marca: string;

  @Prop({ required: true, trim: true })
  modelo: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(TipoInstrumento),
    index: true,
  })
  tipo: TipoInstrumento;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(CategoriaExactitud),
  })
  categoriaExactitud: CategoriaExactitud;

  @Prop({ required: true, min: 0.000001 })
  capacidadMaxima: number; // Max > 0

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UnidadMedida),
    default: UnidadMedida.KG,
  })
  unidadMedida: UnidadMedida;

  @Prop({ min: 0 })
  divisionEscala?: number; // d o e

  @Prop({ min: 0 })
  numeroDivisionesVerificacion?: number; // n = Max / e

  @Prop({ trim: true })
  codigoPrecintoSIMEL?: string;

  @Prop({ type: PropietarioInfo })
  propietario?: PropietarioInfo;

  @Prop({ trim: true })
  ubicacionFisica?: string;

  @Prop({ required: true })
  fechaUltimaCalibracion: Date;

  @Prop({ required: true, index: true })
  fechaProximaCalibracion: Date;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(EstadoInstrumento),
    default: EstadoInstrumento.VIGENTE,
    index: true,
  })
  estado: EstadoInstrumento;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario' })
  creadoPor?: Usuario | string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Usuario' })
  actualizadoPor?: Usuario | string;
}

export const InstrumentoSchema = SchemaFactory.createForClass(Instrumento);

// Índices para optimizar búsquedas frecuentes por serial, estado y tipo
InstrumentoSchema.index({ serial: 1, estado: 1 });
InstrumentoSchema.index({ fechaProximaCalibracion: 1, estado: 1 });
