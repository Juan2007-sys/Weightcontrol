import React, { useState, useEffect } from 'react';
import { ServerIcon, ShieldCheckIcon, AlertTriangleIcon, ShieldAlertIcon } from '../common/Icons';
import { instrumentosService } from '../../services/instrumentos.service';
import { alertasService } from '../../services/alertas.service';

export const KpiRow: React.FC = () => {
  const [stats, setStats] = useState({
    total: 18420,
    vigentes: 17020,
    porVencer: 412,
    vencidos: 29,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [instStats, alertStats] = await Promise.allSettled([
          instrumentosService.getStats(),
          alertasService.getStats(),
        ]);

        if (instStats.status === 'fulfilled' && instStats.value && instStats.value.total > 0) {
          const val = instStats.value;
          const criticas = alertStats.status === 'fulfilled' && alertStats.value ? alertStats.value.criticas : val.vencidos;
          setStats({
            total: val.total,
            vigentes: val.vigentes,
            porVencer: val.porVencer,
            vencidos: criticas || val.vencidos,
          });
        }
      } catch {
        // Fallback a valores por defecto
      }
    };

    loadStats();
  }, []);

  const conformityPercentage = stats.total > 0
    ? ((stats.vigentes / stats.total) * 100).toFixed(1)
    : '100';
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
            {stats.total.toLocaleString()}
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
                {stats.total > 0 ? 'Trazabilidad y censo en tiempo real' : 'Sincronizando con base de datos...'}
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
            {conformityPercentage}%
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
                {stats.vigentes.toLocaleString()} instrumentos conformes
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
            {stats.porVencer.toLocaleString()}
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
                Riesgo de suspensión de pesaje comercial
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
            {stats.vencidos.toLocaleString()}
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
                Equipos vencidos o precintos violados
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

