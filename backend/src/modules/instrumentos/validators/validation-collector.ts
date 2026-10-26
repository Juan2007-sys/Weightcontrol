import { FieldError, ValidationResult } from './instrumento-validator.interface.js';

/**
 * Acumula errores de validacion manteniendo el contrato `errors: string[]`
 * y agregando `fieldErrors` ({campo, mensaje}) para que la UI los asocie al campo.
 */
export class ValidationCollector {
  readonly errors: string[] = [];
  readonly fieldErrors: FieldError[] = [];

  add(campo: string, mensaje: string): void {
    this.errors.push(mensaje);
    this.fieldErrors.push({ campo, mensaje });
  }

  result(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      fieldErrors: this.fieldErrors,
    };
  }
}
