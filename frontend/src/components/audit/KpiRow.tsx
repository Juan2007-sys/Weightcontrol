import React from 'react';
import { ServerIcon, ShieldCheckIcon, AlertTriangleIcon, ShieldAlertIcon } from '../common/Icons';

export const KpiRow: React.FC = () => {
  return (
    <section
      aria-label="Indicadores Clave de Desempeño Metrológico Nacional"
      style={{
        paddingBottom: '24px',
      }}
    >
      <div
        className="gov-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}
      >
        {/* KPI 1: Navy - Universo Fiscalizado */}
        <div className="gov-card accent-border-navy" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="microlabel" style={{ color: 'var(--text-muted)' }}>
              UNIVERSO FISCALIZADO
            </span>
            <span className="status-pill navy">
              CENSO RUMP ACTIVO
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--navy-900)',
              lineHeight: 1.05,
              margin: '12px 0 10px 0',
            }}
          >
            18.420
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border)',
              paddingTop: '10px',
            }}
          >
            <ServerIcon size={16} strokeWidth={1.5} style={{ color: 'var(--navy-900)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                99.2% trazabilidad en 32 departamentos
              </p>
              <p style={{ fontSize: '11px' }}>
                Base de datos RUMP sincronizada con INM
              </p>
            </div>
          </div>
        </div>

        {/* KPI 2: Verde - Conformidad Metrológica */}
        <div className="gov-card accent-border-ok" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="microlabel" style={{ color: 'var(--text-muted)' }}>
              CONFORMIDAD METROLÓGICA
            </span>
            <span className="status-pill ok">
              APTO OIML R 76-1
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#065F46',
              lineHeight: 1.05,
              margin: '12px 0 10px 0',
            }}
          >
            92.4%
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border)',
              paddingTop: '10px',
            }}
          >
            <ShieldCheckIcon size={16} strokeWidth={1.5} style={{ color: 'var(--ok)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                17.020 instrumentos dentro del EMP
              </p>
              <p style={{ fontSize: '11px' }}>
                Validaciones conformes bajo NTC 2031
              </p>
            </div>
          </div>
        </div>

        {/* KPI 3: Ámbar - Calibraciones por Vencer */}
        <div className="gov-card accent-border-warn" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="microlabel" style={{ color: 'var(--text-muted)' }}>
              POR VENCER (&lt; 30 DÍAS)
            </span>
            <span className="status-pill warn">
              ALERTA PREVENTIVA
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#92400E',
              lineHeight: 1.05,
              margin: '12px 0 10px 0',
            }}
          >
            412
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border)',
              paddingTop: '10px',
            }}
          >
            <AlertTriangleIcon size={16} strokeWidth={1.5} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Notificaciones automáticas radicadas
              </p>
              <p style={{ fontSize: '11px' }}>
                Riesgo inminente de suspensión de pesaje
              </p>
            </div>
          </div>
        </div>

        {/* KPI 4: Rojo - Medidas Cautelares y Precintos Rotos */}
        <div className="gov-card accent-border-danger" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="microlabel" style={{ color: 'var(--text-muted)' }}>
              MEDIDAS CAUTELARES
            </span>
            <span className="status-pill danger">
              SELLAMIENTO SIC
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#991B1B',
              lineHeight: 1.05,
              margin: '12px 0 10px 0',
            }}
          >
            29
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--border)',
              paddingTop: '10px',
            }}
          >
            <ShieldAlertIcon size={16} strokeWidth={1.5} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                21 precintos SIMEL violados / adulterados
              </p>
              <p style={{ fontSize: '11px' }}>
                Apertura formal de pliego de cargos SIC
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

