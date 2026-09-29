import {
  EstadoInstrumento,
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../../../schemas/instrumento.schema.js';

export class PublicUltimoCertificadoDto {
  numeroCertificado: string;
  codigoFolio?: string;
  fechaCalibracion: Date;
  resultado: string;
  pdfUrl?: string;
}

export class PublicVerificationDto {
  serial: string;
  marca: string;
  modelo: string;
  tipo: TipoInstrumento;
  categoriaExactitud: CategoriaExactitud;
  capacidadMaxima: number;
  capacidadMinima: number;
  unidadMedida: UnidadMedida;
  divisionEscala: number;
  estadoMetrologico: EstadoInstrumento;
  esVigente: boolean;
  fechaUltimaCalibracion: Date;
  fechaProximaCalibracion: Date;
  codigoPrecintoSIMEL?: string;
  ultimoCertificado?: PublicUltimoCertificadoDto;
  mensajeVerificacion: string;
}
