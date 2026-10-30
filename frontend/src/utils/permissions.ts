/**
 * Permisos de interfaz (solo para mostrar u ocultar acciones). La autorizacion real vive en el
 * backend (JwtAuthGuard + RolesGuard); estas reglas deben coincidir con sus @Roles.
 */
export type Rol = string | undefined | null;

/** Registrar instrumentos: POST /instrumentos. */
export const canRegisterInstrument = (rol: Rol): boolean =>
  rol === 'ADMIN' || rol === 'TECNICO' || rol === 'INSTITUCION_ACREDITACION';

/** Emitir certificados de calibracion: POST /calibraciones. */
export const canIssueCalibration = (rol: Rol): boolean =>
  rol === 'ADMIN' || rol === 'TECNICO' || rol === 'INSTITUCION_ACREDITACION';

/** Pantallas que exigen sesion iniciada. */
export const SCREENS_REQUIRING_LOGIN = ['registro', 'instrumentos', 'validaciones', 'administracion'] as const;
