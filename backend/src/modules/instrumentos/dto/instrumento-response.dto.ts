import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
  PropietarioInfo,
  EvidenciasFotograficas,
} from '../../../schemas/instrumento.schema.js';

export interface InstrumentoResponseDto {
  id: string;
  serial: string;
  marca: string;
  modelo: string;
  tipo: TipoInstrumento;
  categoriaExactitud: CategoriaExactitud;
  capacidadMaxima: number;
  capacidadMinima: number;
  unidadMedida: UnidadMedida;
  divisionEscala: number;
  numeroDivisionesVerificacion?: number;
  codigoPrecintoSIMEL?: string;
  propietario?: PropietarioInfo;
  evidenciasFotograficas?: EvidenciasFotograficas;
  ubicacionFisica?: string;
  fechaUltimaCalibracion: Date;
  fechaProximaCalibracion: Date;
  estado: EstadoInstrumento;
  creadoPor?: any;
  actualizadoPor?: any;
  createdAt?: Date;
  updatedAt?: Date;
}
