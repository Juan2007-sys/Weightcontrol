import { TipoInstrumento, CategoriaExactitud } from '../../../schemas/instrumento.schema.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface InstrumentoValidationData {
  serial: string;
  marca: string;
  modelo: string;
  tipo: TipoInstrumento;
  categoriaExactitud: CategoriaExactitud;
  capacidadMaxima: number;
  unidadMedida: string;
  divisionEscala?: number;
  numeroDivisionesVerificacion?: number;
  codigoPrecintoSIMEL?: string;
  fechaUltimaCalibracion: Date;
  fechaProximaCalibracion: Date;
}

export interface InstrumentoValidator {
  supports(tipo: TipoInstrumento): boolean;
  validate(data: InstrumentoValidationData): ValidationResult;
}
