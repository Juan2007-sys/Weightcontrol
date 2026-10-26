/**
 * Utilidad unica de fechas.
 *
 * Las fechas de calibracion son fechas CALENDARIO (sin hora ni zona): el backend las entrega como
 * `YYYY-MM-DD` o como ISO a medianoche UTC (`2026-10-24T00:00:00.000Z`). Convertirlas con
 * `new Date(...).toLocaleDateString()` en UTC-5 las muestra un dia antes. Aqui se toman los
 * componentes Y-M-D tal cual vienen, sin pasar por la zona horaria local.
 */

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?Z?$)/;

/** `dd/mm/aaaa` para una fecha calendario; devuelve `fallback` si no hay valor valido. */
export const formatCalendarDate = (value?: string | Date | null, fallback = 'No registrada'): string => {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const m = ISO_DATE_PREFIX.exec(value.trim());
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  // Instante real con hora: se muestra en hora local.
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Fecha y hora locales para instantes reales (createdAt, eventos de auditoria). */
export const formatDateTime = (value?: string | Date | null, fallback = '—'): string => {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleString('es-CO');
};

/** Valor `YYYY-MM-DD` de hoy en hora LOCAL (para inputs type="date"), sin desfase por UTC. */
export const todayLocalISO = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
