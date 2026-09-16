import React from 'react';

export const GovFooter: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--gov-bar)',
        color: '#94A3B8',
        borderTop: '1px solid #1E293B',
        marginTop: 'auto',
        fontSize: '12px',
        padding: '24px 0',
      }}
      role="contentinfo"
    >
      <div className="gov-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontWeight: 700 }}>
              <span style={{ backgroundColor: '#FFFFFF', color: 'var(--gov-bar)', padding: '2px 6px', borderRadius: '2px', fontSize: '9px', letterSpacing: '0.08em' }}>
                SIC
              </span>
              <span>SUPERINTENDENCIA DE INDUSTRIA Y COMERCIO · REPÚBLICA DE COLOMBIA</span>
            </div>
            <p style={{ marginTop: '6px', color: '#64748B', fontSize: '11px', maxWidth: '600px' }}>
              Autoridad Nacional de Metrología Legal y Protección al Consumidor. Sistema Integrado de Control Metrológico (SICM-COL). Sede Principal: Carrera 13 No. 27 - 00, Bogotá D.C., Colombia.
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B' }}>
            <div>Línea Gratuita Nacional: <strong>01 8000 910165</strong> | Conmutador: <strong>(601) 587 00 00</strong></div>
            <div>Horario de Radicación: Lunes a Viernes 8:00 a.m. a 4:30 p.m. (NIST UTC-5)</div>
            <div className="font-mono microlabel-sm" style={{ color: '#94A3B8', marginTop: '4px' }}>
              HSM NODE CLUSTER: BOG-01 · SSL CERT: DIGICERT SHA256
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11px',
            color: '#64748B',
          }}
        >
          <div>
            © 2025 Superintendencia de Industria y Comercio. Todos los derechos reservados.
          </div>
          <div style={{ display: 'flex', gap: '16px' }} className="microlabel-sm">
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              POLÍTICA HABEAS DATA
            </a>
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              TÉRMINOS Y CONDICIONES SICM-COL
            </a>
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>
              PORTAL INSTITUCIONAL SIC
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

