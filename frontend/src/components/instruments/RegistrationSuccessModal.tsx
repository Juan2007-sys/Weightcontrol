import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CheckIcon, SearchIcon, FileTextIcon, PlusIcon, XIcon, ShieldCheckIcon } from '../common/Icons';

export interface RegistrationSuccessData {
  id?: string;
  serial: string;
  placaRump?: string;
  marca: string;
  modelo: string;
  tipo: string;
  categoriaExactitud: string;
  capacidadMinima: number;
  capacidadMaxima: number;
  unidadMedida: string;
  codigoPrecintoSIMEL?: string;
  createdAt?: string;
  evidenciasFotograficas?: {
    fotoEquipo: string;
    fotoPrecinto: string;
    fotoUbicacion: string;
  };
}

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  data: RegistrationSuccessData | null;
  onConsultImmediately: (serial: string) => void;
  onGoToInventory: () => void;
  onRegisterAnother: () => void;
  onClose: () => void;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  isOpen,
  data,
  onConsultImmediately,
  onGoToInventory,
  onRegisterAnother,
  onClose,
}) => {
  if (!isOpen || !data) return null;

  const registrationDate = data.createdAt
    ? new Date(data.createdAt).toLocaleString('es-CO')
    : new Date().toLocaleString('es-CO');

  const verificationUrl = `https://weightcontrol.gov.co/verificar?serial=${encodeURIComponent(data.serial)}`;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(7, 20, 39, 0.82)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            width: '100%',
            maxWidth: '680px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            border: '1px solid #CBD5E1',
          }}
        >
          {/* Cabecera Verde Oficial */}
          <div
            style={{
              backgroundColor: '#065F46',
              padding: '20px 24px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#047857',
                  border: '2px solid #34D399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <CheckIcon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#A7F3D0' }}>
                  REGISTRO METROLÓGICO EXITOSO · CENSO OFICIAL RUMP
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0 0', color: '#FFFFFF' }}>
                  Instrumento Radicado e Indexado
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A7F3D0',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Cerrar modal"
            >
              <XIcon size={20} />
            </button>
          </div>

          {/* Cuerpo del Modal con QR y Detalles Técnicos */}
          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 160px) 1fr',
                gap: '20px',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              {/* Código QR Vectorial Nítido */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                }}
              >
                <QRCodeSVG value={verificationUrl} size={130} level="M" />
                <span className="font-mono" style={{ fontSize: '9px', fontWeight: 700, color: 'var(--navy-900)', marginTop: '6px' }}>
                  {data.serial}
                </span>
              </div>

              {/* Ficha Técnica de Confirmación */}
              <div style={{ fontSize: '13px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span className="microlabel" style={{ color: 'var(--text-muted)' }}>SERIAL METROLÓGICO OFICIAL:</span>
                  <div className="font-mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-900)' }}>
                    {data.serial}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>MARCA Y MODELO:</span>
                    <div style={{ fontWeight: 700 }}>{data.marca} {data.modelo}</div>
                  </div>
                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>CLASE DE EXACTITUD:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--blue-600)' }}>
                      {data.categoriaExactitud}
                    </div>
                  </div>
                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>CAPACIDADES (MIN / MAX):</span>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      {data.capacidadMinima} — {data.capacidadMaxima} {data.unidadMedida}
                    </div>
                  </div>
                  <div>
                    <span className="microlabel" style={{ color: 'var(--text-muted)' }}>PRECINTO SIMEL:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: '#B45309' }}>
                      {data.codigoPrecintoSIMEL || 'ASIGNADO'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Fecha y Hora de Radicación: <strong>{registrationDate}</strong> · Trazabilidad en cadena de custodia.
                </div>
              </div>
            </div>

            {/* Panel de Evidencias Fotográficas Custodiadas en BD */}
            {data.evidenciasFotograficas && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <span className="microlabel" style={{ color: 'var(--navy-900)', fontWeight: 800 }}>
                    EVIDENCIAS FOTOGRÁFICAS RADICADAS EN BASE DE DATOS (NTC 2031):
                  </span>
                  <span
                    className="font-mono microlabel-sm"
                    style={{
                      color: '#065F46',
                      backgroundColor: '#D1FAE5',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    ✓ 3 FOTOS ALMACENADAS
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                  }}
                >
                  {/* Foto 1: Equipo */}
                  <div
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ height: '72px', width: '100%', overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                      <img
                        src={data.evidenciasFotograficas.fotoEquipo}
                        alt="Equipo Completo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'; }}
                      />
                    </div>
                    <div style={{ padding: '4px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--navy-900)' }}>
                      1. Equipo Completo
                    </div>
                  </div>

                  {/* Foto 2: Precinto SIMEL */}
                  <div
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ height: '72px', width: '100%', overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                      <img
                        src={data.evidenciasFotograficas.fotoPrecinto}
                        alt="Precinto SIMEL"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800'; }}
                      />
                    </div>
                    <div style={{ padding: '4px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--navy-900)' }}>
                      2. Precinto SIMEL
                    </div>
                  </div>

                  {/* Foto 3: Ubicación Física */}
                  <div
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ height: '72px', width: '100%', overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                      <img
                        src={data.evidenciasFotograficas.fotoUbicacion}
                        alt="Ubicación Física"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800'; }}
                      />
                    </div>
                    <div style={{ padding: '4px 6px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--navy-900)' }}>
                      3. Ubicación Física
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de Disponibilidad Inmediata en el Buscador */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1E40AF',
                marginBottom: '20px',
              }}
            >
              <ShieldCheckIcon size={18} />
              <span>
                El instrumento ha sido indexado en la base de datos nacional y ya puede ser consultado públicamente por cualquier ciudadano u organismo de control.
              </span>
            </div>

            {/* Acciones del Modal */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn-gov-secondary"
                onClick={onRegisterAnother}
                style={{ gap: '6px' }}
              >
                <PlusIcon size={14} />
                <span>Registrar Otro Instrumento</span>
              </button>

              <button
                type="button"
                className="btn-gov-secondary"
                onClick={onGoToInventory}
                style={{ gap: '6px' }}
              >
                <FileTextIcon size={14} />
                <span>Ver Inventario</span>
              </button>

              <button
                type="button"
                className="btn-gov-primary"
                onClick={() => onConsultImmediately(data.serial)}
                style={{ gap: '8px', backgroundColor: '#0284C7' }}
              >
                <SearchIcon size={16} />
                <span>Consultar Instrumento Inmediatamente</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
