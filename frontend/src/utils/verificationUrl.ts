/**
 * URL publica de consulta de certificados. Apunta a la propia aplicacion
 * (raiz + query) para que funcione sin depender de reglas de reescritura del hosting.
 *
 * HU-05: el QR oficial lo genera el backend con `?cert=&serial=&sig=` (firma HMAC sobre
 * cert+serial). El frontend NO puede firmar, asi que `cert` solo se incluye cuando se
 * entrega junto con su `sig`; sin firma el enlace lleva unicamente el serial (consulta manual).
 */
export const buildVerificationUrl = (params: { serial?: string; cert?: string; sig?: string }): string => {
  const url = new URL('/', window.location.origin);
  if (params.cert && params.sig) {
    url.searchParams.set('cert', params.cert);
    url.searchParams.set('sig', params.sig);
  }
  if (params.serial) url.searchParams.set('serial', params.serial);
  return url.toString();
};

export interface VerificationQuery {
  serial: string;
  cert: string;
  sig: string;
}

/** Lee serial, cert y sig de la URL actual (llegada desde un QR firmado). */
export const readVerificationQuery = (): VerificationQuery => {
  const sp = new URLSearchParams(window.location.search);
  return {
    serial: (sp.get('serial') || '').trim(),
    cert: (sp.get('cert') || '').trim(),
    sig: (sp.get('sig') || '').trim(),
  };
};

/**
 * Identificador a mostrar/consultar al llegar por URL: el serial (si viene) o, en su defecto, el cert.
 * La firma (`sig`) y el `cert` se obtienen con `readVerificationQuery()` y viajan al backend
 * en la consulta de verificacion.
 */
export const readVerificationParam = (): string => {
  const q = readVerificationQuery();
  return q.serial || q.cert;
};
