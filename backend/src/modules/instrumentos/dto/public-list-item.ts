import { InstrumentoResponseDto } from './instrumento-response.dto.js';

/** Campos con datos personales/sensibles que nunca se exponen sin sesion (Habeas Data, HU-05). */
const CAMPOS_PRIVADOS = [
  'propietario',
  'creadoPor',
  'actualizadoPor',
  'evidenciasFotograficas',
  'ubicacionFisica',
] as const;

export type PublicListItem = Omit<InstrumentoResponseDto, (typeof CAMPOS_PRIVADOS)[number]>;

export function toPublicListItem(item: InstrumentoResponseDto): PublicListItem {
  const copia: Record<string, unknown> = { ...item };
  for (const campo of CAMPOS_PRIVADOS) delete copia[campo];
  return copia as unknown as PublicListItem;
}
