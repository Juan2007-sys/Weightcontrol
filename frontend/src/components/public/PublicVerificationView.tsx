import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  SearchIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  FileTextIcon,
  QrCodeIcon,
  DownloadIcon,
  LockIcon,
  EyeIcon,
} from '../common/Icons';
import { instrumentosService } from '../../services/instrumentos.service';
import type { PublicVerificationDto } from '../../services/instrumentos.service';
import { calibracionesService } from '../../services/calibraciones.service';
import { QrScannerModal } from './QrScannerModal';
import { PdfCertificateViewerModal } from '../common/PdfCertificateViewerModal';
import { toast } from 'sonner';
import { buildVerificationUrl, readVerificationQuery } from '../../utils/verificationUrl';
import { formatCalendarDate } from '../../utils/dates';

interface PublicVerificationViewProps {
  initialSerial?: string;
  onNavigateToLogin?: () => void;
  onBack?: () => void;
}

export const PublicVerificationView: React.FC<PublicVerificationViewProps> = ({
  initialSerial = '',
  onBack,
}) => {
  const [searchSerial, setSearchSerial] = useState(initialSerial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicVerificationDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // QR firmado con el que se llego a la pagina (?cert=&serial=&sig=); solo se aplica a la consulta automatica inicial.
  const urlQrRef = useRef<{ cert: string; sig: string } | null | undefined>(undefined);
  const takeUrlQr = (target: string): { cert: string; sig: string } | undefined => {
    if (urlQrRef.current === undefined) {
      const q = readVerificationQuery();
      urlQrRef.current =
        q.cert && (q.serial.toUpperCase() === target || q.cert.toUpperCase() === target)
          ? { cert: q.cert, sig: q.sig }
          : null;
    }
    return urlQrRef.current ?? undefined;
  };

  const handleSearch = async (serialToSearch?: string, qrFromScanner?: { cert?: string; sig?: string }) => {
    const target = (serialToSearch || searchSerial).trim().toUpperCase();
    // Consulta automatica al cargar (serialToSearch === initialSerial): usa el QR de la URL si existe.
    const isAutoLoad = Boolean(serialToSearch) && target === initialSerial.trim().toUpperCase();
    const qr = qrFromScanner ?? (isAutoLoad ? takeUrlQr(target) : undefined);
    if (!target) {
      toast.error('Por favor ingrese un número de serial metrológico.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      // QR firmado (HU-05): se envian cert y sig; la consulta manual por serial va sin ellos.
      const data = await instrumentosService.verifyPublic(target, qr);
      setResult(data);
      // El resultado se muestra en pantalla; no se emiten avisos de exito redundantes.
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || '';

      // HU-05 Criterio 3: Mensaje explícito "certificado no verificable"
      if (
        status === 404 ||
        msg.toLowerCase().includes('no verificable') ||
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('no encontrado')
      ) {
        setErrorMessage(
          '⚠️ Certificado no verificable: El instrumento o código consultado no cuenta con registro metrológico válido o ha sido alterado en el censo RUMP.'
        );
      } else {
        setErrorMessage(`Error en la consulta pública: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Estado publico coherente (color + icono + texto): un certificado anulado o con resultado
  // No Conforme nunca se presenta como VIGENTE aunque las fechas no hayan vencido.
  const publicStatus = (() => {
    if (!result) return null;
    const noConforme = result.ultimoCertificado?.resultado === 'No Conforme';
    // Un No Conforme tiene prioridad: el backend tambien lo marca anulado, pero el motivo publico es el dictamen.
    if (noConforme) {
      return { ok: false, chip: 'NO CONFORME', title: 'ESTADO: INSTRUMENTO NO CONFORME / NO VIGENTE' };
    }
    if (result.certificadoAnulado) {
      return { ok: false, chip: 'ANULADO', title: 'ESTADO: CERTIFICADO ANULADO / NO VIGENTE' };
    }
    if (!result.esVigente) {
      return { ok: false, chip: 'NO VIGENTE', title: 'ESTADO: INSTRUMENTO NO APTO / VENCIDO' };
    }
    return { ok: true, chip: 'VIGENTE', title: 'ESTADO: INSTRUMENTO CONFORME Y VIGENTE' };
  })();

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      const certId = result.ultimoCertificado?.numeroCertificado || result.serial;
      await calibracionesService.triggerPdfDownload(
        certId,
        `Certificado-Metrologico-${result.serial}.pdf`
      );
      toast.success('Certificado oficial descargado exitosamente en formato PDF.');
    } catch {
      toast.error('No se pudo descargar el certificado en este momento.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Consulta automática al llegar desde un QR o con un serial precargado.
  const autoSearchedRef = useRef<string>('');
  useEffect(() => {
    // StrictMode ejecuta el efecto dos veces en desarrollo: se consulta una sola vez por serial.
    if (initialSerial.trim() && autoSearchedRef.current !== initialSerial) {
      autoSearchedRef.current = initialSerial;
      handleSearch(initialSerial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSerial]);

  return (
    <div style={{ paddingBottom: '48px', backgroundColor: '#F8FAFC', minHeight: '80vh' }}>
      <div className="gov-container" style={{ paddingTop: '24px' }}>
        {/* Banner Superior de Portal Público Ciudadano */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              borderLeft: '4px solid var(--blue-600)',
              paddingLeft: '18px',
            }}
          >
            <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
              PORTAL DE ACCESO CIUDADANO ABIERTO · TRANSPARENCIA Y CONTROL SOCIAL (HABEAS DATA)
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '34px',
                fontWeight: 800,
                color: 'var(--navy-900)',
                margin: '4px 0 0 0',
                letterSpacing: '-0.02em',
              }}
            >
              Consulta Pública y Verificación Metrológica
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Verificación instantánea de autenticidad, vigencia y estado metrológico de básculas y pesas según la norma <strong>NTC 2031</strong> y el <strong>Decreto 1074 de 2015</strong>.
            </p>
          </div>

          {onBack && (
            <button
              type="button"
              className="btn-gov-secondary"
              onClick={onBack}
              style={{ height: '36px', fontSize: '12px' }}
            >
              ← Volver al Panel Principal
            </button>
          )}
        </div>

        {/* Garantía de Privacidad Habeas Data */}
        <div
          className="gov-card"
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <LockIcon size={20} style={{ color: '#1D4ED8', flexShrink: 0 }} />
          <div style={{ fontSize: '12px', color: '#1E3A8A' }}>
            <strong>Protección de Datos Personales (Ley 1581 de 2012 / Habeas Data):</strong> Esta consulta pública expone únicamente información de conformidad técnica y trazabilidad metrológica. La identidad, datos financieros y ubicación privada del propietario permanecen estrictamente resguardados.
          </div>
        </div>

        {/* Barra de Búsqueda Pública por Serial */}
        <div
          className="gov-card"
          style={{
            padding: '24px',
            backgroundColor: '#FFFFFF',
            marginBottom: '24px',
            border: '1px solid var(--border)',
          }}
        >
          <label
            htmlFor="public-serial-input"
            className="microlabel"
            style={{ display: 'block', color: 'var(--navy-900)', marginBottom: '8px', fontWeight: 800 }}
          >
            INGRESE EL NÚMERO DE SERIAL TROQUELADO O ESCANEE EL CÓDIGO QR
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <input
                id="public-serial-input"
                type="text"
                autoComplete="off"
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={errorMessage ? 'public-verification-error' : undefined}
                className="font-mono"
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: BAL-2025-99201-BOG o RUMP-CO-841920"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-input)',
                  border: '2px solid var(--border-strong)',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--navy-900)',
                }}
              />
            </div>
            <button
              type="button"
              className="btn-gov-primary"
              disabled={loading}
              aria-busy={loading}
              onClick={() => handleSearch()}
              style={{ padding: '0 20px', height: '46px', fontSize: '14px' }}
            >
              <SearchIcon size={16} />
              <span>{loading ? 'Consultando RUMP...' : 'Verificar'}</span>
            </button>
            <button
              type="button"
              className="btn-gov-secondary"
              onClick={() => setIsScannerOpen(true)}
              style={{ padding: '0 18px', height: '46px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--blue-600)', color: 'var(--navy-900)' }}
              title="Abrir cámara del dispositivo para escanear código QR"
            >
              <QrCodeIcon size={18} />
              <span>Escanear con Cámara</span>
            </button>
          </div>
        </div>

        {/* Mensaje de Error Explícito: Certificado no verificable */}
        <div aria-live="polite" aria-atomic="true">
        {errorMessage && (
          <div
            id="public-verification-error"
            role="alert"
            className="gov-card"
            style={{
              padding: '20px 24px',
              backgroundColor: '#FEF2F2',
              border: '2px solid #DC2626',
              borderRadius: 'var(--radius-card)',
              color: '#991B1B',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangleIcon size={24} style={{ color: '#DC2626', flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Dictamen de Consulta Pública
                </h2>
                <div style={{ fontSize: '14px', marginTop: '4px', fontWeight: 600 }}>
                  {errorMessage}
                </div>
                <div style={{ fontSize: '12px', marginTop: '6px', color: '#7F1D1D' }}>
                  Si usted es el comerciante responsable, comuníquese con su Organismo Evaluador de la Conformidad (OEC) acreditado o ingrese a la consola técnica.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ficha Oficial de Resultados Metrológicos Públicos */}
        {result && (
          <div
            className="gov-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Encabezado del Dictamen */}
            <div
              style={{
                padding: '20px 24px',
                backgroundColor: publicStatus?.ok ? '#064E3B' : '#7F1D1D',
                color: '#FFFFFF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheckIcon size={28} />
                <div>
                  <div className="microlabel" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    DICTAMEN METROLÓGICO OFICIAL DE CONFORMIDAD
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                    {publicStatus?.title}
                  </h2>
                  {result.certificadoAnulado && result.ultimoCertificado?.resultado !== 'No Conforme' && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                      Este certificado fue anulado y reemplazado
                      {result.ultimoCertificado?.reemplazadoPorNumero
                        ? ` por el certificado ${result.ultimoCertificado.reemplazadoPorNumero}`
                        : ''}
                      . No lo utilice como prueba de conformidad.
                    </p>
                  )}
                </div>
              </div>

              <span
                data-testid="public-status-chip"
                style={{
                  backgroundColor: publicStatus?.ok ? 'var(--ok)' : 'var(--danger)',
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 800,
                  fontSize: '13px',
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {publicStatus?.ok ? <ShieldCheckIcon size={14} aria-hidden="true" /> : <AlertTriangleIcon size={14} aria-hidden="true" />}
                {publicStatus?.chip}
              </span>
            </div>

            {/* Contenido Técnico Dividido en 2 Columnas */}
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
              {/* Columna Izquierda: Especificaciones Técnicas */}
              <div>
                <h3 className="microlabel" style={{ color: 'var(--navy-900)', marginTop: 0, marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  1. IDENTIFICACIÓN Y ESPECIFICACIONES TÉCNICAS (NTC 2031)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>SERIAL OFICIAL:</span>
                    <div className="font-mono" style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: '14px' }}>
                      {result.serial}
                    </div>
                  </div>

                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>MARCA Y MODELO:</span>
                    <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                      {result.marca} {result.modelo}
                    </div>
                  </div>

                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>TIPO DE INSTRUMENTO:</span>
                    <div style={{ fontWeight: 600 }}>{result.tipo}</div>
                  </div>

                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>CLASE DE EXACTITUD:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--blue-600)' }}>
                      {result.categoriaExactitud}
                    </div>
                  </div>

                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>CAPACIDADES (MIN / MAX):</span>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      Min {result.capacidadMinima} {result.unidadMedida} · Max {result.capacidadMaxima} {result.unidadMedida}
                    </div>
                  </div>

                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>DIVISIÓN DE ESCALA (e):</span>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      {result.divisionEscala} {result.unidadMedida}
                    </div>
                  </div>

                  {result.codigoPrecintoSIMEL && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="microlabel" style={{ color: 'var(--text-muted)' }}>PRECINTO DE SEGURIDAD SIMEL:</span>
                      <div className="font-mono" style={{ fontWeight: 800, color: '#B45309' }}>
                        {result.codigoPrecintoSIMEL}
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="microlabel" style={{ color: 'var(--navy-900)', marginTop: '20px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  2. VIGENCIA Y CRONOGRAMA LEGAL
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>ÚLTIMA CALIBRACIÓN:</span>
                    <div className="font-mono" style={{ fontWeight: 700 }}>
                      {formatCalendarDate(result.fechaUltimaCalibracion)}
                    </div>
                  </div>

                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>PRÓXIMA CALIBRACIÓN LÍMITE:</span>
                    <div className="font-mono" style={{ fontWeight: 800, color: publicStatus?.ok ? '#065F46' : '#991B1B' }}>
                      {formatCalendarDate(result.fechaProximaCalibracion)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Código QR Dinámico y Certificado */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <h3 className="microlabel" style={{ color: 'var(--navy-900)', marginTop: 0, marginBottom: '8px' }}>
                  CÓDIGO QR DINÁMICO DE VERIFICACIÓN
                </h3>

                {/* Renderizado de QR Vectorial Nítido con qrcode.react */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px solid var(--border-strong)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <QRCodeSVG
                    value={buildVerificationUrl({ serial: result.serial })}
                    size={136}
                    level="M"
                    includeMargin={false}
                    title={`Código QR de consulta pública del instrumento ${result.serial}`}
                  />
                  <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-900)', marginTop: '8px' }}>
                    {result.serial}
                  </span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  Escanee con cualquier cámara móvil para verificar la vigencia en tiempo real.
                </p>

                <div style={{ marginTop: '16px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-gov-primary"
                    onClick={() => setIsPdfModalOpen(true)}
                    style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px' }}
                  >
                    <EyeIcon size={16} />
                    <FileTextIcon size={16} />
                    <span>Visualizar Certificado Oficial</span>
                  </button>

                  <button
                    type="button"
                    className="btn-gov-secondary"
                    disabled={downloadingPdf}
                    onClick={handleDownloadPdf}
                    style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    <DownloadIcon size={14} />
                    <span>{downloadingPdf ? 'Generando PDF...' : 'Descargar Archivo (.PDF)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* Modal de Previsualización Interactiva Oficial de Certificado PDF */}
        {result && (
          <PdfCertificateViewerModal
            isOpen={isPdfModalOpen}
            certIdOrFolio={result.ultimoCertificado?.numeroCertificado || result.serial}
            title={`Certificado Oficial · ${result.serial}`}
            metadata={{
              numeroCertificado: result.ultimoCertificado?.numeroCertificado,
              serial: result.serial,
              marca: result.marca,
              modelo: result.modelo,
              estado: publicStatus?.ok ? 'VIGENTE · CONFORME' : result.certificadoAnulado ? 'ANULADO' : 'VENCIDO O NO CONFORME',
              fechaEmision: result.fechaUltimaCalibracion,
              fechaVencimiento: result.fechaProximaCalibracion,
              precintoSIMEL: result.codigoPrecintoSIMEL,
              hashSha256: result.ultimoCertificado?.hashSha256,
              laboratorioOEC: result.ultimoCertificado?.laboratorioAcreditado,
            }}
            onClose={() => setIsPdfModalOpen(false)}
          />
        )}

        {/* Modal de Escaneo con Cámara Web / Móvil */}
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(scannedSerial, qr) => {
            setSearchSerial(scannedSerial);
            handleSearch(scannedSerial, qr);
            toast.success(`Código QR escaneado: ${scannedSerial}`);
          }}
        />
      </div>
    </div>
  );
};
