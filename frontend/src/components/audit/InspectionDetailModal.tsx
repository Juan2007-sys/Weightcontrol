import React from 'react';
import type { MetrologicalInstrument } from '../../types/metrology';
import { XIcon, ShieldCheckIcon, AlertTriangleIcon, ShieldAlertIcon, FileTextIcon, LockIcon } from '../common/Icons';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface InspectionDetailModalProps {
  instrument: MetrologicalInstrument | null;
  onClose: () => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  instrument,
  onClose,
}) => {
  if (!instrument) return null;

  const isCritical = instrument.estado === 'CRÍTICA (MEDIDA INMEDIATA)' || instrument.estado === 'SUSPENDIDA (CONTROL CAUTELAR)';
  const isWarning = instrument.estado === 'POR VENCER (<30 DÍAS)' || instrument.estado === 'VENCIDO / NO APTO';

  const chartData = [
    { carga: '0 kg', error: 0, toleranciaPos: 5, toleranciaNeg: -5 },
    { carga: '5 kg', error: 2, toleranciaPos: 5, toleranciaNeg: -5 },
    { carga: '10 kg', error: 6, toleranciaPos: 7.5, toleranciaNeg: -7.5 },
    { carga: '15 kg', error: isCritical ? 18 : 4, toleranciaPos: 7.5, toleranciaNeg: -7.5 },
    { carga: '20 kg', error: isCritical ? 24 : 5, toleranciaPos: 10, toleranciaNeg: -10 },
    { carga: '30 kg', error: isCritical ? 32 : 6, toleranciaPos: 15, toleranciaNeg: -15 },
  ];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(7, 20, 39, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <motion.div
        className="gov-card"
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.25), 0 10px 15px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Cabecera del Expediente (Navy Institucional) */}
        <div
          style={{
            backgroundColor: 'var(--navy-900)',
            color: '#FFFFFF',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextIcon size={20} strokeWidth={1.75} style={{ color: 'var(--blue-50)' }} />
            <div>
              <div className="microlabel" style={{ color: '#94A3B8' }}>
                EXPEDIENTE METROLÓGICO OFICIAL · SICM-COL
              </div>
              <h2
                id="modal-title"
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: '-0.01em',
                  color: '#FFFFFF',
                }}
              >
                Acta de Inspección y Dictamen Técnico Metrológico
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar expediente"
            style={{
              color: '#FFFFFF',
              opacity: 0.8,
              padding: '6px',
              borderRadius: 'var(--radius-pill)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.15s ease',
            }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Cuerpo del Expediente */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Banner de Estado del Instrumento */}
          <div
            style={{
              backgroundColor: isCritical ? 'var(--danger-bg)' : isWarning ? 'var(--warn-bg)' : 'var(--ok-bg)',
              border: `1px solid ${isCritical ? 'rgba(220,38,38,0.3)' : isWarning ? 'rgba(217,119,6,0.3)' : 'rgba(14,159,110,0.3)'}`,
              padding: '12px 16px',
              borderRadius: 'var(--radius-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isCritical ? (
                <ShieldAlertIcon size={20} style={{ color: 'var(--danger)' }} />
              ) : isWarning ? (
                <AlertTriangleIcon size={20} style={{ color: 'var(--warn)' }} />
              ) : (
                <ShieldCheckIcon size={20} style={{ color: 'var(--ok)' }} />
              )}
              <div>
                <span className="microlabel" style={{ color: 'var(--navy-900)' }}>
                  ESTADO PROCESAL Y REGULATORIO:
                </span>{' '}
                <strong style={{ color: 'var(--navy-900)' }}>{instrument.estado}</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {instrument.irregularidad}
                </p>
              </div>
            </div>

            <div className="font-mono microlabel-sm" style={{ color: 'var(--navy-900)' }}>
              RADICADO SIC: <strong>RAD-2025-MET-{instrument.id.padStart(5, '0')}</strong>
            </div>
          </div>

          {/* Grilla de Datos Técnicos en 2 Columnas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Columna A: Identificación Técnica */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                1. IDENTIFICACIÓN Y ESPECIFICACIONES TÉCNICAS (NTC 2031)
              </div>

              <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '8px', fontSize: '13px' }}>
                <dt style={{ color: 'var(--text-muted)' }}>N° Serie Físico:</dt>
                <dd className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{instrument.serial}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Placa RUMP:</dt>
                <dd className="font-mono" style={{ fontWeight: 600 }}>{instrument.placaRump}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Tipo de Equipo:</dt>
                <dd style={{ fontWeight: 600 }}>{instrument.tipoInstrumento}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Marca y Modelo:</dt>
                <dd>{instrument.marca} · {instrument.modelo}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Capacidad Máxima:</dt>
                <dd className="font-mono">{instrument.capacidadMax}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>División de Escala:</dt>
                <dd className="font-mono">{instrument.divisionEscala}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Versión Firmware:</dt>
                <dd className="font-mono">{instrument.versionFirmware}</dd>
              </dl>
            </div>

            {/* Columna B: Titular y Custodia Legal */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                2. TITULAR SUJETO A CONTROL Y PRECINTO SIMEL
              </div>

              <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '8px', fontSize: '13px' }}>
                <dt style={{ color: 'var(--text-muted)' }}>Razón Social:</dt>
                <dd style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{instrument.establecimiento}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>NIT Registrado:</dt>
                <dd className="font-mono" style={{ fontWeight: 600 }}>{instrument.nit}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Ubicación Física:</dt>
                <dd>{instrument.municipio} ({instrument.departamento})</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Precinto SIMEL:</dt>
                <dd className="font-mono" style={{ fontWeight: 700, color: isCritical ? 'var(--danger)' : 'var(--navy-900)' }}>
                  {instrument.precintoSIMEL}
                </dd>

                <dt style={{ color: 'var(--text-muted)' }}>OEC Acreditado:</dt>
                <dd className="font-mono">{instrument.oecAcreditado}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Nodo Auditor:</dt>
                <dd className="font-mono">{instrument.deteccionSistema}</dd>

                <dt style={{ color: 'var(--text-muted)' }}>Fecha Detección:</dt>
                <dd className="font-mono">{instrument.timestampDeteccion}</dd>
              </dl>
            </div>
          </div>

          {/* Gráfico / Tabla de Ensayos Metrológicos de Error Máximo Permisible (EMP) */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
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
              <div className="microlabel" style={{ color: 'var(--navy-900)' }}>
                3. RESULTADO DE ENSAYOS METROLÓGICOS IN-SITU (NTC 2031 / OIML R 76-1)
              </div>
              <span className="microlabel-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                TOLERANCIA DE ENSAYO: ± 1.0e (0-5kg) · ± 1.5e (5-20kg)
              </span>
            </div>

            {/* Gráfico Recharts de Curva de Calibración vs EMP */}
            <div style={{ height: '170px', width: '100%', marginTop: '6px', marginBottom: '14px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="carga" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} unit="g" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1F3F', borderRadius: '4px', border: 'none', color: '#FFFFFF', fontSize: '11px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '2px' }} />
                  <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />
                  <Line type="stepAfter" dataKey="toleranciaPos" name="+EMP Límite (g)" stroke="#D97706" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                  <Line type="stepAfter" dataKey="toleranciaNeg" name="-EMP Límite (g)" stroke="#D97706" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                  <Bar dataKey="error" name="Error Medido (g)" fill={isCritical ? '#DC2626' : '#0E9F6E'} radius={[3, 3, 0, 0]} barSize={22} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid var(--border)' }}>
                  <th scope="col" className="microlabel-sm" style={{ padding: '8px', textAlign: 'left', color: 'var(--navy-900)' }}>CARGA PATRÓN ($L$)</th>
                  <th scope="col" className="microlabel-sm" style={{ padding: '8px', textAlign: 'left', color: 'var(--navy-900)' }}>INDICACIÓN ($I$)</th>
                  <th scope="col" className="microlabel-sm" style={{ padding: '8px', textAlign: 'left', color: 'var(--navy-900)' }}>ERROR OBSERVADO ($E$)</th>
                  <th scope="col" className="microlabel-sm" style={{ padding: '8px', textAlign: 'left', color: 'var(--navy-900)' }}>EMP PERMISIBLE</th>
                  <th scope="col" className="microlabel-sm" style={{ padding: '8px', textAlign: 'center', color: 'var(--navy-900)' }}>DICTAMEN</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="font-mono" style={{ padding: '8px' }}>5.000 kg</td>
                  <td className="font-mono" style={{ padding: '8px' }}>5.002 kg</td>
                  <td className="font-mono" style={{ padding: '8px' }}>+0.002 kg (+0.4e)</td>
                  <td className="font-mono" style={{ padding: '8px' }}>± 0.005 kg (1.0e)</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span className="status-pill ok">CONFORME</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="font-mono" style={{ padding: '8px' }}>10.000 kg</td>
                  <td className="font-mono" style={{ padding: '8px' }}>10.006 kg</td>
                  <td className="font-mono" style={{ padding: '8px' }}>+0.006 kg (+1.2e)</td>
                  <td className="font-mono" style={{ padding: '8px' }}>± 0.0075 kg (1.5e)</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span className="status-pill ok">CONFORME</span>
                  </td>
                </tr>
                <tr style={{ backgroundColor: isCritical ? '#FEF2F2' : '#FFFFFF', borderBottom: '1px solid var(--border)' }}>
                  <td className="font-mono" style={{ padding: '8px', fontWeight: 600 }}>15.000 kg (Carga Media/Máx)</td>
                  <td className="font-mono" style={{ padding: '8px', fontWeight: 600 }}>{isCritical ? '15.018 kg' : '15.004 kg'}</td>
                  <td className="font-mono" style={{ padding: '8px', color: isCritical ? 'var(--danger)' : 'var(--navy-900)', fontWeight: 700 }}>
                    {isCritical ? '+0.018 kg (+3.6e)' : '+0.004 kg (+0.8e)'}
                  </td>
                  <td className="font-mono" style={{ padding: '8px' }}>± 0.0075 kg (1.5e)</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span className={`status-pill ${isCritical ? 'danger' : 'ok'}`}>
                      {isCritical ? 'NO CONFORME' : 'CONFORME'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sello de Integridad Criptográfica HSM */}
          <div
            style={{
              backgroundColor: 'var(--gov-bar)',
              color: '#CBD5E1',
              padding: '14px 18px',
              borderRadius: 'var(--radius-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LockIcon size={16} style={{ color: '#38BDF8' }} />
              <div>
                <span className="microlabel" style={{ color: '#94A3B8' }}>CADENA DE CUSTODIA CRIPTOGRÁFICA SICM:</span>
                <div className="font-mono" style={{ color: '#FFFFFF' }}>
                  Firma: 9f8a-44c1-2290-b184-eefc91a0 · HSM-KEY #9842 (Nivel FIPS 140-2 L3)
                </div>
              </div>
            </div>

            <div className="microlabel font-mono" style={{ color: 'var(--ok)' }}>
              INTEGRIDAD DEL REGISTRO AUDITABLE
            </div>
          </div>
        </div>

        {/* Pie con Acciones Operativas */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div className="microlabel font-mono" style={{ color: 'var(--text-muted)' }}>
            ACCIÓN RECOMENDADA: <strong style={{ color: 'var(--navy-900)' }}>{instrument.accionRecomendada}</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-gov-secondary"
              onClick={onClose}
            >
              Cerrar Expediente
            </button>
            <button
              type="button"
              className="btn-gov-primary"
              onClick={() => {
                toast.success(`Dictamen Oficial (.PDF) emitido y firmado con HSM para ${instrument.establecimiento} (NIT ${instrument.nit})`);
                onClose();
              }}
            >
              <FileTextIcon size={14} />
              <span>Emitir Dictamen Oficial (.PDF)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
