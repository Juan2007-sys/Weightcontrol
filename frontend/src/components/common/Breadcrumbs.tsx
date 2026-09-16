import React from 'react';

interface BreadcrumbsProps {
  moduleName?: string;
  subSection?: string;
  oecCode?: string;
  scopeExpiration?: string;
  privilegeLevel?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  moduleName = 'INSPECCIÓN Y VIGILANCIA',
  subSection = 'AUDITORÍA Y FISCALIZACIÓN NACIONAL DE INSTRUMENTOS',
  oecCode = 'ONAC-18-LAB-042',
  scopeExpiration = '31/DIC/2026',
  privilegeLevel = 'NIVEL L3 · AUDITOR DE VIGILANCIA',
}) => {
  return (
    <nav
      aria-label="Ruta de navegación y acreditación"
      style={{
        padding: '16px 0 12px 0',
      }}
    >
      <div
        className="gov-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Miga de pan en microlabel */}
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
          className="microlabel"
        >
          <li style={{ color: 'var(--text-muted)' }}>
            <a href="#inicio" style={{ color: 'inherit', textDecoration: 'none' }}>
              INICIO
            </a>
          </li>
          <li aria-hidden="true" style={{ color: 'var(--border-strong)' }}>/</li>
          <li style={{ color: 'var(--text-muted)' }}>
            <span>{moduleName}</span>
          </li>
          <li aria-hidden="true" style={{ color: 'var(--border-strong)' }}>/</li>
          <li aria-current="page" style={{ color: 'var(--blue-600)', fontWeight: 700 }}>
            {subSection}
          </li>
        </ol>

        {/* Chips de contexto técnico y alcance metrológico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            className="font-mono microlabel-sm"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 8px',
              color: 'var(--navy-900)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>OEC COD:</span> <strong>{oecCode}</strong>
          </div>

          <div
            className="font-mono microlabel-sm"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 8px',
              color: 'var(--navy-900)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>EXP. ALCANCE:</span> <strong>{scopeExpiration}</strong>
          </div>

          <div
            className="status-pill navy microlabel-sm"
            style={{
              padding: '3px 8px',
            }}
          >
            <span>{privilegeLevel}</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

