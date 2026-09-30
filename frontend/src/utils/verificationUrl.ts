/**
 * URL pública de consulta de certificados. Apunta a la propia aplicación
 * (raíz + query) para que funcione sin depender de reglas de reescritura del hosting.
 */
export const buildVerificationUrl = (params: { serial?: string; cert?: string }): string => {
  const url = new URL('/', window.location.origin);
  if (params.cert) url.searchParams.set('cert', params.cert);
  if (params.serial) url.searchParams.set('serial', params.serial);
  return url.toString();
};

/** Lee el identificador a verificar (cert o serial) de la URL actual, si existe. */
export const readVerificationParam = (): string => {
  const sp = new URLSearchParams(window.location.search);
  return (sp.get('cert') || sp.get('serial') || '').trim();
};
