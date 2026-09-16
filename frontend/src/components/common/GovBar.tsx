import React from 'react';

export const GovBar: React.FC = () => {
  return (
    <header 
      style={{
        backgroundColor: 'var(--gov-bar)',
        color: '#FFFFFF',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        userSelect: 'none',
        fontSize: '11px',
        lineHeight: 1,
      }}
      role="banner"
      aria-label="Barra de Gobierno Nacional de la República de Colombia"
    >
      <div className="gov-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Izquierda: Pill Colombia + Entidades en microlabel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              backgroundColor: '#FFFFFF',
              color: 'var(--gov-bar)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 800,
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            REPÚBLICA DE COLOMBIA
          </span>

          <nav aria-label="Entidades del Estado" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8' }} className="microlabel-sm">
            <span>GOBIERNO NACIONAL</span>
            <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>SUPERINTENDENCIA DE INDUSTRIA Y COMERCIO (SIC)</span>
            <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
            <span>RUMP REGISTRO ÚNICO METROLÓGICO</span>
          </nav>
        </div>

        {/* Derecha: Canal de atención oficial SIC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#CBD5E1' }} className="microlabel-sm">
          <span>
            CANAL DE ATENCIÓN CIUDADANA Y RADICACIÓN
          </span>
          <span aria-hidden="true" style={{ opacity: 0.4 }}>|</span>
          <span style={{ fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.08em' }}>
            LÍNEA NACIONAL SIC: 01 8000 910165
          </span>
        </div>
      </div>
    </header>
  );
};

