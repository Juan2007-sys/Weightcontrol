import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { ShieldCheckIcon, AlertTriangleIcon } from '../common/Icons';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setScannerError(null);
    const scannerElementId = 'reader-qr-camera';

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerElementId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            rememberLastUsedCamera: true,
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText: string) => {
            // Extraer serial o certificado de URL si el QR contiene https://.../verificar?serial=... o ?cert=...
            let serial = decodedText.trim();
            try {
              if (serial.startsWith('http://') || serial.startsWith('https://')) {
                const url = new URL(serial);
                const paramValue = url.searchParams.get('serial') || url.searchParams.get('cert');
                if (paramValue) {
                  serial = paramValue;
                } else {
                  const segments = url.pathname.split('/').filter(Boolean);
                  if (segments.length > 0) {
                    serial = segments[segments.length - 1];
                  }
                }
              } else if (serial.includes('/')) {
                const parts = serial.split('/').filter(Boolean);
                serial = parts[parts.length - 1];
              }
            } catch {
              // Si no es URL estándar, dejamos el texto tal como vino
            }

            scanner.clear().catch(() => {});
            onScanSuccess(serial);
            onClose();
          },
          (errorMessage: string) => {
            // Errores comunes de frame sin QR son ignorados
            if (errorMessage && !errorMessage.includes('No MultiFormat Readers')) {
              // debug
            }
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        setScannerError(
          'No se pudo acceder a la cámara. Por favor asegúrese de conceder permisos de video en su navegador.'
        );
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 31, 63, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="gov-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          borderRadius: 'var(--radius-card)',
          position: 'relative',
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: 'var(--blue-600)' }}>
              <ShieldCheckIcon size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                Escanear Código QR
              </h3>
              <div className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>
                Precinto SIMEL / Placa RUMP
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Visor de Cámara */}
        <div style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {scannerError ? (
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-card)',
                color: 'var(--danger)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangleIcon size={18} />
              <span>{scannerError}</span>
            </div>
          ) : (
            <div
              id="reader-qr-camera"
              style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}
            />
          )}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
          Enfoca el código QR impreso en el precinto holográfico o en el certificado del instrumento para verificarlo al instante.
        </p>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-gov-secondary"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
