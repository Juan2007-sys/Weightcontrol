import React from 'react';
import { DownloadIcon, BalanceIcon } from '../common/Icons';

interface TitleBlockProps {
  onExportReport?: (format: 'PDF' | 'CSV') => void;
  onNewInspection?: () => void;
}

export const TitleBlock: React.FC<TitleBlockProps> = ({ onExportReport, onNewInspection }) => {
  return (
    <section
      aria-label="Encabezado del módulo de fiscalización y marco normativo"
      style={{
        padding: '12px 0 24px 0',
      }}
    >
      <div
        className="gov-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '32px',
          flexWrap: 'wrap',
        }}
      >
        {/* Bloque de texto con barra azul de 4px a la izquierda */}
        <div
          style={{
            borderLeft: '4px solid var(--blue-600)',
            paddingLeft: '18px',
            maxWidth: '820px',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '44px',
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              color: 'var(--navy-900)',
              margin: 0,
            }}
          >
            Auditoría y Trazabilidad Nacional<br />
            de Instrumentos Metrológicos
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--text-muted)',
              marginTop: '12px',
            }}
          >
            Fiscalización y control de errores máximos permisibles (EMP) e integridad de precintos SIMEL bajo el{' '}
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" title="Consultar Decreto 1074 de 2015">
              Decreto 1074 de 2015
            </a>
            , la{' '}
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" title="Consultar Ley 1480 de 2011">
              Ley 1480 de 2011
            </a>
            , la norma metrológica{' '}
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" title="Norma Técnica Colombiana NTC 2031">
              NTC 2031
            </a>
            , acreditación{' '}
            <a href="https://onac.org.co" target="_blank" rel="noopener noreferrer" title="Criterios NTC-ISO/IEC 17020">
              NTC-ISO/IEC 17020
            </a>
            , la{' '}
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" title="Resolución SIC 77723 de 2018">
              Resolución SIC 77723 de 2018
            </a>{' '}
            y la recomendación internacional{' '}
            <a href="https://www.oiml.org" target="_blank" rel="noopener noreferrer" title="Recomendación Internacional OIML R 76-1">
              OIML R 76-1
            </a>
            .
          </p>
        </div>

        {/* Botones de acción operativos en la cabecera */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '6px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn-gov-secondary"
            onClick={() => {
              if (onExportReport) {
                onExportReport('PDF');
              }
            }}
            title="Exportar informe técnico consolidado en formatos PDF y CSV"
          >
            <DownloadIcon size={16} />
            <span>Descargar informe (.PDF / .CSV)</span>
          </button>

          <button
            type="button"
            className="btn-gov-primary"
            onClick={onNewInspection}
            title="Iniciar diligencia de inspección metrológica legal"
          >
            <BalanceIcon size={16} />
            <span>Radicar Inspección Técnica</span>
          </button>
        </div>
      </div>
    </section>
  );
};

