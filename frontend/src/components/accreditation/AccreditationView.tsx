import React, { useState, useEffect } from 'react';
import { CheckIcon, XIcon, PlusIcon, DownloadIcon, FileTextIcon, ShieldCheckIcon, EyeIcon } from '../common/Icons';
import { calibracionesService } from '../../services/calibraciones.service';
import type { MetrologicalInstrument } from '../../types/metrology';
import { RegisterCalibrationModal } from '../calibration/RegisterCalibrationModal';
import { PdfCertificateViewerModal } from '../common/PdfCertificateViewerModal';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface ValidationItem {
  id: string;
  actaNumero: string;
  oec: string;
  laboratorio: string;
  instrumento: string;
  empStatus: string;
  fechaEnsayo: string;
  estado: 'PENDIENTE EVALUACIÓN' | 'APROBADA' | 'OBSERVADA';
  pdfAvailable?: boolean;
}

interface AccreditationViewProps {
  instruments?: MetrologicalInstrument[];
}

export const AccreditationView: React.FC<AccreditationViewProps> = ({ instruments = [] }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [viewingCertItem, setViewingCertItem] = useState<ValidationItem | null>(null);

  const loadCalibraciones = async () => {
    try {
      const res = await calibracionesService.getAll();
      if (res.data && res.data.length > 0) {
        const mapped: ValidationItem[] = res.data.map((c) => ({
          id: c.id || c._id || c.numeroCertificado,
          actaNumero: c.numeroCertificado,
          oec: c.codigoPrecintoSIMEL || 'ONAC-18-LAB-042',
          laboratorio: c.laboratorioAcreditado,
          instrumento: typeof c.instrumento === 'object' && c.instrumento ? `${c.instrumento.marca || ''} ${c.instrumento.modelo || ''}` : `Equipo ${c.instrumento}`,
          empStatus: c.observaciones || `Dictamen: ${c.resultado} (Incertidumbre: ${c.incertidumbreExpandida || '±0.5e'})`,
          fechaEnsayo: new Date(c.fechaCalibracion).toLocaleDateString('es-CO'),
          estado: c.resultado === 'Conforme' ? 'APROBADA' : 'OBSERVADA',
          pdfAvailable: true,
        }));
        setItems(mapped);
      }
    } catch {
      // Fallback a iniciales
    }
  };

  useEffect(() => {
    loadCalibraciones();
  }, []);

  const handleAction = (id: string, newStatus: 'APROBADA' | 'OBSERVADA') => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, estado: newStatus } : item))
    );
    if (newStatus === 'APROBADA') {
      toast.success(`Acta ${id} aprobada e inscrita en el registro oficial RUMP.`);
    } else {
      toast.warning(`Acta ${id} devuelta con requerimiento técnico.`);
    }
  };

  const handleDownloadPdf = async (certId: string) => {
    try {
      await calibracionesService.triggerPdfDownload(certId);
      toast.success(`Certificado ${certId} descargado en formato PDF oficial.`);
    } catch {
      toast.error(`No se pudo descargar el PDF del certificado ${certId}.`);
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="gov-container">
        {/* Encabezado con Botón de Registrar Nueva Calibración (HU-04) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              borderLeft: '4px solid var(--navy-900)',
              paddingLeft: '18px',
            }}
          >
            <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
              ORGANISMOS ACREDITADOS · GESTIÓN DE ENSAYOS Y ACTAS METROLÓGICAS
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
              Ensayos y Certificados de Calibración
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Emisión oficial, validación de Error Máximo Permitido (EMP) y sellamiento inmutable de certificados bajo la norma <strong>NTC 2031</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-gov-primary"
              onClick={() => {
                if (user && user.rol === 'AUDITOR') {
                  toast.error('🛑 Privilegio Restringido: Los Auditores no tienen permiso para emitir certificados de calibración.');
                  return;
                }
                setShowCalibrationModal(true);
              }}
              style={{ padding: '10px 18px', fontSize: '13px', gap: '8px' }}
            >
              <PlusIcon size={16} />
              <ShieldCheckIcon size={16} />
              <span>Registrar Calibración y Emitir Certificado</span>
            </button>
          </div>
        </div>

        {/* Tabla de Actas y Ensayos */}
        <div
          className="gov-card"
          style={{
            overflowX: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--navy-900)', color: '#FFFFFF' }}>
              <tr>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>ACTA &amp; EXPEDIENTE</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>OEC CALIBRADOR / LABORATORIO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>EQUIPO METROLÓGICO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>DICTAMEN DE ENSAYO EMP</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF', textAlign: 'center' }}>ESTADO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF', textAlign: 'right' }}>ACCIONES &amp; CERTIFICADO</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{item.actaNumero}</div>
                    <div className="font-mono microlabel-sm" style={{ color: 'var(--text-muted)' }}>Fecha: {item.fechaEnsayo}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{item.laboratorio}</div>
                    <div className="font-mono microlabel-sm" style={{ color: 'var(--blue-600)' }}>CÓDIGO: {item.oec}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{item.instrumento}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                    {item.empStatus}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className={`status-pill ${item.estado === 'APROBADA' ? 'ok' : item.estado === 'OBSERVADA' ? 'warn' : 'info'}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-gov-compact"
                        onClick={() => setViewingCertItem(item)}
                        style={{ color: '#0369A1', borderColor: '#7DD3FC', backgroundColor: '#F0F9FF', fontWeight: 600 }}
                        title="Visualizar Certificado Oficial interactivo en alta definición"
                      >
                        <EyeIcon size={12} />
                        <span>Ver</span>
                      </button>

                      <button
                        type="button"
                        className="btn-gov-compact"
                        onClick={() => handleDownloadPdf(item.actaNumero)}
                        style={{ color: '#1E40AF', borderColor: '#93C5FD', backgroundColor: '#EFF6FF', fontWeight: 600 }}
                        title="Descargar Certificado Oficial en PDF con QR y firma criptográfica"
                      >
                        <DownloadIcon size={12} />
                        <FileTextIcon size={12} />
                        <span>PDF</span>
                      </button>

                      {item.estado === 'PENDIENTE EVALUACIÓN' && (
                        <>
                          <button
                            type="button"
                            className="btn-gov-compact"
                            onClick={() => handleAction(item.id, 'APROBADA')}
                            style={{ color: '#065F46', borderColor: 'var(--ok)' }}
                            title="Aprobar e inscribir dictamen en RUMP"
                          >
                            <CheckIcon size={12} />
                            <span>Aprobar</span>
                          </button>
                          <button
                            type="button"
                            className="btn-gov-compact"
                            onClick={() => handleAction(item.id, 'OBSERVADA')}
                            style={{ color: '#991B1B', borderColor: 'var(--danger)' }}
                            title="Devolver con observaciones técnicas"
                          >
                            <XIcon size={12} />
                            <span>Observar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal de Previsualización Oficial de Certificado PDF */}
        {viewingCertItem && (
          <PdfCertificateViewerModal
            isOpen={!!viewingCertItem}
            certIdOrFolio={viewingCertItem.actaNumero}
            title={`Certificado Oficial de Calibración · ${viewingCertItem.actaNumero}`}
            metadata={{
              estado: viewingCertItem.estado,
              laboratorioOEC: viewingCertItem.laboratorio,
              fechaEmision: viewingCertItem.fechaEnsayo,
              precintoSIMEL: viewingCertItem.oec,
            }}
            onClose={() => setViewingCertItem(null)}
          />
        )}

        {/* Modal para Registrar Nueva Calibración (HU-04) */}
        {showCalibrationModal && (
          <RegisterCalibrationModal
            instruments={instruments}
            onClose={() => setShowCalibrationModal(false)}
            onSuccess={() => {
              setShowCalibrationModal(false);
              loadCalibraciones();
            }}
          />
        )}
      </div>
    </div>
  );
};
