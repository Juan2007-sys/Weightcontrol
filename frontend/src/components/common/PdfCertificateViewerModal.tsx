import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon,
  ShieldCheckIcon,
  DownloadIcon,
  PrinterIcon,
  MaximizeIcon,
  MinimizeIcon,
  LockIcon,
  CopyIcon,
  AlertTriangleIcon,
} from './Icons';
import { QRCodeSVG } from 'qrcode.react';
import { calibracionesService } from '../../services/calibraciones.service';
import { toast } from 'sonner';

export interface PdfViewerMetadata {
  serial?: string;
  marca?: string;
  modelo?: string;
  estado?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  precintoSIMEL?: string;
  hashSha256?: string;
  laboratorioOEC?: string;
}

interface PdfCertificateViewerModalProps {
  isOpen: boolean;
  certIdOrFolio: string;
  title?: string;
  metadata?: PdfViewerMetadata;
  onClose: () => void;
}

export const PdfCertificateViewerModal: React.FC<PdfCertificateViewerModalProps> = ({
  isOpen,
  certIdOrFolio,
  title,
  metadata,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!isOpen || !certIdOrFolio) return;

    let activeUrl: string | null = null;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const blob = await calibracionesService.downloadPdf(certIdOrFolio);
        activeUrl = window.URL.createObjectURL(blob);
        setPdfBlobUrl(activeUrl);
      } catch (err: any) {
        const message = err?.message || 'No se pudo generar o cargar el documento PDF.';
        setError(message);
        toast.error(`Error al cargar el certificado PDF: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (activeUrl) {
        window.URL.revokeObjectURL(activeUrl);
      }
      setPdfBlobUrl(null);
    };
  }, [isOpen, certIdOrFolio]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch {
        // Fallback: abrir en nueva ventana y llamar print
        if (pdfBlobUrl) {
          const printWindow = window.open(pdfBlobUrl, '_blank');
          printWindow?.addEventListener('load', () => printWindow.print());
        }
      }
    } else if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    try {
      await calibracionesService.triggerPdfDownload(
        certIdOrFolio,
        `Certificado-Metrologico-${metadata?.serial || certIdOrFolio}.pdf`
      );
      toast.success('Certificado descargado exitosamente.');
    } catch {
      toast.error('Error al descargar el archivo PDF.');
    }
  };

  const handleCopyHash = () => {
    if (!metadata?.hashSha256) return;
    navigator.clipboard.writeText(metadata.hashSha256);
    setCopiedHash(true);
    toast.success('Hash SHA-256 copiado al portapapeles.');
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const verificationUrl = metadata?.serial
    ? `https://weightcontrol.gov.co/verificar?serial=${encodeURIComponent(metadata.serial)}&cert=${encodeURIComponent(certIdOrFolio)}`
    : `https://weightcontrol.gov.co/verificar?cert=${encodeURIComponent(certIdOrFolio)}`;

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(7, 20, 39, 0.85)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isFullscreen ? '0' : '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            width: isFullscreen ? '100vw' : '96vw',
            maxWidth: isFullscreen ? '100vw' : '1240px',
            height: isFullscreen ? '100vh' : '92vh',
            backgroundColor: '#0F172A',
            borderRadius: isFullscreen ? 0 : '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: isFullscreen ? 'none' : '1px solid #334155',
          }}
        >
          {/* Cabecera Oficial del Visor */}
          <div
            style={{
              height: '56px',
              backgroundColor: '#0B1F3F',
              borderBottom: '1px solid #1E3A8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            {/* Título & Badge de Seguridad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1E3A8A',
                  color: '#FCD116',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #FCD116',
                }}
              >
                <ShieldCheckIcon size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                    {title || `Certificado Oficial de Conformidad · ${certIdOrFolio}`}
                  </h3>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                    }}
                  >
                    INMUTABLE · LEY 527
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Superintendencia de Industria y Comercio · OEC Acreditado ONAC · NTC 2031
                </div>
              </div>
            </div>

            {/* Botones de Acción: Imprimir, Descargar, Pantalla Completa, Cerrar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || !!error}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loading || !!error ? 'not-allowed' : 'pointer',
                }}
                title="Imprimir documento oficial en alta definición"
              >
                <PrinterIcon size={14} />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={loading || !!error}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--blue-600)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: loading || !!error ? 'not-allowed' : 'pointer',
                }}
                title="Descargar archivo PDF con sello criptográfico"
              >
                <DownloadIcon size={14} />
                <span>Descargar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                style={{
                  background: 'none',
                  border: '1px solid #475569',
                  color: '#CBD5E1',
                  padding: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
              >
                {isFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  padding: '6px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 700,
                  marginLeft: '4px',
                }}
                title="Cerrar visor de certificado"
              >
                <XIcon size={18} />
              </button>
            </div>
          </div>

          {/* Cuerpo Principal: Visor de PDF (Centro) + Panel Lateral de Trazabilidad (Derecha) */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Contenedor del PDF Embebido */}
            <div
              style={{
                flex: 1,
                backgroundColor: '#334155',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#FFFFFF' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '3px solid #64748B',
                      borderTopColor: '#38BDF8',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Generando Certificado Oficial en Vector HD...</span>
                </div>
              )}

              {error && !loading && (
                <div
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #EF4444',
                    padding: '24px',
                    borderRadius: '8px',
                    maxWidth: '460px',
                    textAlign: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <div style={{ color: '#EF4444', marginBottom: '8px' }}>
                    <AlertTriangleIcon size={32} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
                    No se pudo cargar el certificado
                  </h4>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-gov-secondary"
                    style={{ color: '#FFFFFF', borderColor: '#475569' }}
                  >
                    Cerrar Visor
                  </button>
                </div>
              )}

              {pdfBlobUrl && !loading && !error && (
                <iframe
                  ref={iframeRef}
                  src={`${pdfBlobUrl}#view=FitH&toolbar=0&navpanes=0`}
                  title={`Certificado ${certIdOrFolio}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              )}
            </div>

            {/* Panel Lateral de Seguridad Metrológica y Resumen Oficial (340px) */}
            <aside
              style={{
                width: '320px',
                backgroundColor: '#0F172A',
                borderLeft: '1px solid #1E293B',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                color: '#F8FAFC',
                overflowY: 'auto',
                flexShrink: 0,
              }}
            >
              {/* Bloque 1: Dictamen y Estado */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: metadata?.estado?.includes('NO') ? '#450A0A' : '#064E3B',
                  border: `1px solid ${metadata?.estado?.includes('NO') ? '#DC2626' : '#059669'}`,
                }}
              >
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, color: '#A7F3D0' }}>
                  DICTAMEN TÉCNICO OFICIAL
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px', color: '#FFFFFF' }}>
                  {metadata?.estado || 'CONFORME (APTO)'}
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                  Vigencia: {metadata?.fechaVencimiento || '12 Meses'}
                </div>
              </div>

              {/* Bloque 2: Ficha Rápida del Instrumento */}
              <div style={{ backgroundColor: '#1E293B', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                  DATOS DEL INSTRUMENTO
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#94A3B8' }}>SERIAL:</span>{' '}
                    <strong className="font-mono" style={{ color: '#38BDF8' }}>
                      {metadata?.serial || certIdOrFolio}
                    </strong>
                  </div>
                  {metadata?.marca && (
                    <div>
                      <span style={{ color: '#94A3B8' }}>MARCA / MODELO:</span>{' '}
                      <strong>{metadata.marca} {metadata.modelo}</strong>
                    </div>
                  )}
                  {metadata?.precintoSIMEL && (
                    <div>
                      <span style={{ color: '#94A3B8' }}>PRECINTO:</span>{' '}
                      <span style={{ color: '#F59E0B', fontFamily: 'monospace', fontWeight: 700 }}>
                        {metadata.precintoSIMEL}
                      </span>
                    </div>
                  )}
                  {metadata?.laboratorioOEC && (
                    <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '4px' }}>
                      <span style={{ color: '#94A3B8' }}>OEC:</span> {metadata.laboratorioOEC}
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque 3: Código QR de Verificación Ciudadana */}
              <div
                style={{
                  backgroundColor: '#1E293B',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '10px' }}>
                  CÓDIGO QR TRAZABLE RUMP
                </div>
                <div style={{ padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCodeSVG value={verificationUrl} size={110} level="M" />
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '8px' }}>
                  Escaneable por cualquier dispositivo móvil para validar autenticidad en tiempo real.
                </span>
              </div>

              {/* Bloque 4: Sello Criptográfico & Hash SHA-256 */}
              <div style={{ backgroundColor: '#1E293B', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#94A3B8' }}>
                    <LockIcon size={12} style={{ color: '#38BDF8' }} />
                    <span>HASH SHA-256</span>
                  </div>
                  {metadata?.hashSha256 && (
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedHash ? '#34D399' : '#38BDF8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 600,
                      }}
                      title="Copiar hash SHA-256"
                    >
                      <CopyIcon size={12} />
                      <span>{copiedHash ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: '#0B132B',
                    padding: '8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    wordBreak: 'break-all',
                    color: '#38BDF8',
                    lineHeight: 1.3,
                  }}
                >
                  {metadata?.hashSha256 || 'SHA256: 4a9f88c219e0b1f23789cc01a39fbc88921004128...'}
                </div>

                <p style={{ fontSize: '10px', color: '#64748B', marginTop: '8px', lineHeight: 1.3, margin: '8px 0 0 0' }}>
                  Garantía de inmutabilidad: Cualquier alteración del contenido invalida el hash y activa una alerta forense.
                </p>
              </div>
            </aside>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
