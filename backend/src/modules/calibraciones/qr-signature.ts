import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Firma HMAC-SHA256 del QR del certificado (HU-05).
 *
 * El QR codifica `?cert=<numero>&serial=<serial>&sig=<firma>`. La firma se calcula
 * sobre cert + serial con un secreto del servidor, de modo que nadie pueda fabricar
 * ni alterar un QR (cambiar el cert o el serial invalida la firma).
 *
 * Secreto: `QR_SIGNING_SECRET`. Si no existe se deriva de `JWT_SECRET` con un
 * contexto fijo (HMAC(JWT_SECRET, 'weightcontrol-qr-signing-v1')), asi la clave del QR
 * nunca coincide con la del JWT. Si no hay ninguno de los dos se lanza un error: no
 * existe secreto por defecto en el codigo.
 */
const DERIVATION_CONTEXT = 'weightcontrol-qr-signing-v1';

export function getQrSigningSecret(): string {
  const explicit = process.env.QR_SIGNING_SECRET?.trim();
  if (explicit) return explicit;

  const jwt = process.env.JWT_SECRET?.trim();
  if (jwt) {
    return createHmac('sha256', jwt).update(DERIVATION_CONTEXT).digest('hex');
  }

  throw new Error(
    'Falta QR_SIGNING_SECRET (o JWT_SECRET) para firmar los codigos QR de los certificados.',
  );
}

const normalizeCert = (cert: string): string => (cert ?? '').trim();
const normalizeSerial = (serial: string): string => (serial ?? '').trim().toUpperCase();

/** Firma base64url de `cert|serial` (campos normalizados). */
export function signCertificate(cert: string, serial: string): string {
  const payload = `${normalizeCert(cert)}|${normalizeSerial(serial)}`;
  return createHmac('sha256', getQrSigningSecret()).update(payload).digest('base64url');
}

/** Comparacion en tiempo constante; false ante cualquier firma ausente o malformada. */
export function verifyCertificateSignature(
  cert: string,
  serial: string,
  sig: string | undefined | null,
): boolean {
  if (!sig || typeof sig !== 'string') return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(signCertificate(cert, serial));
  } catch {
    return false;
  }
  const received = Buffer.from(sig);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

/** Construye la URL publica del QR con la firma incluida. */
export function buildSignedVerificationUrl(baseUrl: string, cert: string, serial: string): string {
  const base = (baseUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const sig = signCertificate(cert, serial);
  return `${base}/?cert=${encodeURIComponent(cert)}&serial=${encodeURIComponent(serial)}&sig=${encodeURIComponent(sig)}`;
}
