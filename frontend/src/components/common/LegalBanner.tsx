import React from 'react';
import { AlertTriangleIcon } from './Icons';

export const LegalBanner: React.FC = () => {
  return (
    <aside
      aria-label="Advertencia legal y régimen sancionatorio de metrología legal"
      style={{
        paddingBottom: '32px',
      }}
    >
      <div className="gov-container">
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            borderLeft: '4px solid var(--warn)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            color: '#78350F',
          }}
        >
          <div style={{ color: 'var(--warn)', flexShrink: 0, marginTop: '2px' }}>
            <AlertTriangleIcon size={22} strokeWidth={1.75} />
          </div>

          <div>
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#92400E',
                margin: '0 0 6px 0',
                textTransform: 'uppercase',
              }}
            >
              ADVERTENCIA LEGAL Y SANCIONATORIA · LEY 1480 DE 2011 (ESTATUTO DEL CONSUMIDOR)
            </h3>

            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#78350F',
                margin: 0,
              }}
            >
              La alteración de precintos oficiales de seguridad SIMEL, la intervención no autorizada del software de pesaje, la manipulación de calibraciones o el uso de instrumentos con desviaciones que excedan el <strong>Error Máximo Permisible (EMP)</strong> constituyen infracciones graves sancionadas por la <strong>Superintendencia de Industria y Comercio (SIC)</strong> con multas de hasta <strong>2.000 SMLMV</strong>, decomiso inmediato de equipos, cierre temporal del establecimiento y revocatoria de acreditación ante el <strong>ONAC</strong> (según NTC-ISO/IEC 17020).
            </p>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px dashed rgba(217, 119, 6, 0.3)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: '#92400E',
              }}
            >
              RÉGIMEN PENAL: Artículos 286 (Falsedad ideológica), 287 (Falsedad material en documento público) y 289 del Código Penal Colombiano (Ley 599 de 2000). Pena privativa de la libertad: 48 a 108 meses.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

