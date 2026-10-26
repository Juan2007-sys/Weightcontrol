import {
  EstadoInstrumento,
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../../../schemas/instrumento.schema.js';

export class PublicUltimoCertificadoDto {
  numeroCertificado: string;
  codigoFolio?: string;
  /** Fecha calendario YYYY-MM-DD (sin hora ni zona). */
  fechaCalibracion: string;
  resultado: string;
  pdfUrl?: string;
  /** true si el certificado fue anulado por el flujo de correccion formal (HU-04). */
  anulado?: boolean;
  /** Numero del certificado que reemplaza al anulado (no se expone el motivo interno). */
  reemplazadoPorNumero?: string;
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
  /** Fechas calendario YYYY-MM-DD (sin hora ni zona). */
  fechaUltimaCalibracion: string;
  fechaProximaCalibracion: string;
  codigoPrecintoSIMEL?: string;
  /** true cuando el certificado consultado (p. ej. por QR) esta anulado / no vigente. */
  certificadoAnulado?: boolean;
  ultimoCertificado?: PublicUltimoCertificadoDto;
  mensajeVerificacion: string;
}
