import React, { useState } from 'react';
import { CheckIcon, ShieldCheckIcon } from '../common/Icons';
import { toast } from 'sonner';

export const AdminSettingsView: React.FC = () => {
  const [thresholdDays, setThresholdDays] = useState('30');
  const [periodicityMonths, setPeriodicityMonths] = useState('12');
  const [empToleranceClass, setEmpToleranceClass] = useState('Clase III');
  const timeServer = 'time.nist.gov (NIST UTC-5)';
  const hsmKey = 'HSM-KEY #9842 (FIPS 140-2 Level 3)';
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    toast.success('Parámetros maestros actualizados y replicados en los nodos técnicos.');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="gov-container">
        {/* Encabezado */}
        <div
          style={{
            borderLeft: '4px solid var(--navy-900)',
            paddingLeft: '18px',
            marginBottom: '24px',
          }}
        >
          <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
            CONSOLA DE MANDO CENTRALIZADA · SEGURIDAD Y PARÁMETROS MAESTROS
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '36px',
              fontWeight: 800,
              color: 'var(--navy-900)',
              margin: '4px 0 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            Administración del Sistema y Parámetros Globales
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Ajuste de umbrales regulatorios de alerta, directivas NTC 2031 y telemetría de llaves criptográficas de la SIC.
          </p>
        </div>

        {saved && (
          <div
            style={{
              backgroundColor: 'var(--ok-bg)',
              border: '1px solid var(--ok)',
              color: '#065F46',
              padding: '12px 16px',
              borderRadius: 'var(--radius-card)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
            }}
          >
            <ShieldCheckIcon size={18} />
            <span>Parámetros maestros actualizados y replicados en los 5 nodos técnicos de fiscalización.</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Panel de Configuración Regulatoria */}
          <div className="gov-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
            <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              1. UMBRALES DE ALERTA Y REGLAS METROLÓGICAS (NTC 2031)
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  UMBRAL DE ALERTA TEMPRANA POR VENCIMIENTO (DÍAS DE ANTICIPACIÓN)
                </label>
                <input
                  type="number"
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Define cuándo el estado de un instrumento cambia automáticamente a 'POR VENCER (&lt;30 DÍAS)'.
                </span>
              </div>

              <div>
                <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  PERIODICIDAD DE VERIFICACIÓN PERIÓDICA OBLIGATORIA (MESES)
                </label>
                <input
                  type="number"
                  value={periodicityMonths}
                  onChange={(e) => setPeriodicityMonths(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  12 meses estándar según Decreto 1074 de 2015 para básculas IPFNA.
                </span>
              </div>

              <div>
                <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CATEGORÍA DE EXACTITUD PRINCIPAL DE CONTROL
                </label>
                <select
                  value={empToleranceClass}
                  onChange={(e) => setEmpToleranceClass(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                >
                  <option>Clase I (Especial)</option>
                  <option>Clase II (Fina)</option>
                  <option>Clase III (Media - Balanzas Comerciales)</option>
                  <option>Clase IIII (Ordinaria)</option>
                </select>
              </div>

              <button type="submit" className="btn-gov-primary" style={{ marginTop: '8px' }}>
                <CheckIcon size={14} />
                <span>Guardar Parámetros Regulatorios</span>
              </button>
            </form>
          </div>

          {/* Panel de Infraestructura Criptográfica y Nodos */}
          <div className="gov-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
            <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              2. CRIPTOGRAFÍA, AUDITORÍA Y SINCRONIZACIÓN NIST
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  SERVIDOR DE ESTAMPADO CRONOLÓGICO NIST UTC-5
                </label>
                <input
                  type="text"
                  disabled
                  value={timeServer}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', backgroundColor: '#F8FAFC', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  MÓDULO DE SEGURIDAD EN HARDWARE (HSM MASTER)
                </label>
                <input
                  type="text"
                  disabled
                  value={hsmKey}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', backgroundColor: '#F8FAFC', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: '#F1F5F9', border: '1px solid var(--border)', fontSize: '12px' }}>
                <strong style={{ color: 'var(--navy-900)', display: 'block', marginBottom: '4px' }}>
                  CONECTORES A ENTES EXTERNOS
                </strong>
                <ul style={{ paddingLeft: '18px', margin: 0, color: 'var(--text-muted)' }}>
                  <li>SIMEL (Sistema de Información de Metrología Legal): <strong>EN LÍNEA</strong></li>
                  <li>ONAC (Directorio de Laboratorios Acreditados): <strong>EN LÍNEA</strong></li>
                  <li>INM (Instituto Nacional de Metrología - Patrones): <strong>EN LÍNEA</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

