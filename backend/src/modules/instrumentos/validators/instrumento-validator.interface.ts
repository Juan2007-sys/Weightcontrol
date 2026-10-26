import { TipoInstrumento, CategoriaExactitud } from '../../../schemas/instrumento.schema.js';

/** Error de validacion asociado a un campo del formulario (HU-02). */
export interface FieldError {
  campo: string;
  mensaje: string;
}

export interface ValidationResult {
  isValid: boolean;
  /** Contrato historico: lista plana de mensajes. */
  errors: string[];
  /** Mismos errores con el campo al que pertenecen (aditivo, no rompe `errors`). */
  fieldErrors?: FieldError[];
}

export interface InstrumentoValidationData {
  serial: string;
  marca: string;
  modelo: string;
  tipo: TipoInstrumento;
  categoriaExactitud: CategoriaExactitud;
  capacidadMaxima: number;
  capacidadMinima?: number;
  unidadMedida: string;
  divisionEscala?: number;
  numeroDivisionesVerificacion?: number;
  codigoPrecintoSIMEL?: string;
  evidenciasFotograficas?: {
    fotoEquipo?: string;
    fotoPrecinto?: string;
    fotoUbicacion?: string;
  };
  fechaUltimaCalibracion: Date;
  fechaProximaCalibracion: Date;
}

export interface InstrumentoValidator {
  supports(tipo: TipoInstrumento): boolean;
  validate(data: InstrumentoValidationData): ValidationResult;
}
