import React, { useState } from 'react';
import type { MetrologicalInstrument } from '../../types/metrology';
import { TableIcon, MapPinIcon, EyeIcon } from '../common/Icons';
import { InspectionDetailModal } from './InspectionDetailModal';
import { CartographicView } from './CartographicView';

interface DataTableProps {
  instruments: MetrologicalInstrument[];
}

export const DataTable: React.FC<DataTableProps> = ({ instruments }) => {
  const [viewMode, setViewMode] = useState<'matriz' | 'cartografia'>('matriz');
  const [selectedInstrument, setSelectedInstrument] = useState<MetrologicalInstrument | null>(null);

  const getStatusPillClass = (estado: string): string => {
    switch (estado) {
      case 'VIGENTE (APTO)':
        return 'ok';
      case 'POR VENCER (<30 DÍAS)':
        return 'warn';
      case 'VENCIDO / NO APTO':
      case 'CRÍTICA (MEDIDA INMEDIATA)':
      case 'SUSPENDIDA (CONTROL CAUTELAR)':
        return 'danger';
      case 'PENDIENTE REVISIÓN':
      case 'RECHAZADA / OBSERVADA':
        return 'info';
      default:
        return 'navy';
    }
  };

  return (
    <section
      aria-label="Matriz de fiscalización y trazabilidad metrológica"
      style={{
        paddingBottom: '24px',
      }}
    >
      <div className="gov-container">
        {/* Barra superior de la tabla con conteo oficial y switch de visualización */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Conteo de registros */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="microlabel" style={{ color: 'var(--text-muted)' }}>
              REGISTROS AUDITADOS:
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy-900)' }}>
              Mostrando <span className="font-mono">{instruments.length}</span> de <span className="font-mono">1.076</span> expedientes en radar
            </span>
          </div>

          {/* Toggle MATRIZ REGULATORIA / VISTA CARTOGRÁFICA */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#E2E8F0',
              padding: '3px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-strong)',
            }}
            role="tablist"
            aria-label="Alternar vista de datos"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'matriz'}
              onClick={() => setViewMode('matriz')}
              className="microlabel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: viewMode === 'matriz' ? 'var(--navy-900)' : 'transparent',
                color: viewMode === 'matriz' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <TableIcon size={14} />
              <span>MATRIZ REGULATORIA</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cartografia'}
              onClick={() => setViewMode('cartografia')}
              className="microlabel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: viewMode === 'cartografia' ? 'var(--navy-900)' : 'transparent',
                color: viewMode === 'cartografia' ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <MapPinIcon size={14} />
              <span>VISTA CARTOGRÁFICA</span>
            </button>
          </div>
        </div>

        {/* Vista Cartográfica o Matriz de Datos */}
        {viewMode === 'cartografia' ? (
          <CartographicView />
        ) : (
          <div
            className="gov-card"
            style={{
              overflowX: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              {/* Cabecera Navy Sólida con texto blanco en microlabel */}
              <thead
                style={{
                  backgroundColor: 'var(--navy-900)',
                  color: '#FFFFFF',
                  borderBottom: '2px solid var(--border-strong)',
                }}
              >
                <tr>
                  <th
                    scope="col"
                    className="microlabel"
                    style={{ padding: '14px 16px', color: '#FFFFFF', whiteSpace: 'nowrap' }}
                  >
                    N° SERIE / PLACA RUMP
                  </th>
                  <th
                    scope="col"
                    className="microlabel"
                    style={{ padding: '14px 16px', color: '#FFFFFF', whiteSpace: 'nowrap' }}
                  >
                    ESTABLECIMIENTO &amp; NIT
                  </th>
                  <th
                    scope="col"
                    className="microlabel"
                    style={{ padding: '14px 16px', color: '#FFFFFF', whiteSpace: 'nowrap' }}
                  >
                    TIPO / IRREGULARIDAD
                  </th>
                  <th
                    scope="col"
                    className="microlabel"
                    style={{ padding: '14px 16px', color: '#FFFFFF', whiteSpace: 'nowrap' }}
                  >
                    DETECCIÓN &amp; SISTEMA
                  </th>
                  <th
                    scope="col"
                    className="microlabel"
                    style={{ padding: '14px 16px', color: '#FFFFFF', whiteSpace: 'nowrap', textAlign: 'center' }}
                  >
                    ESTADO
                  </th>
                  <th
                    scope="col"
                    className="microlabel"
                    style={{ padding: '14px 16px', color: '#FFFFFF', whiteSpace: 'nowrap', textAlign: 'right' }}
                  >
                    ACCIÓN OPERATIVA
                  </th>
                </tr>
              </thead>

              <tbody>
                {instruments.map((item, index) => {
                  const isRowCritical =
                    item.estado === 'CRÍTICA (MEDIDA INMEDIATA)' ||
                    item.estado === 'SUSPENDIDA (CONTROL CAUTELAR)';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                        borderBottom: '1px solid var(--border)',
                        borderLeft: isRowCritical ? '4px solid var(--danger)' : '4px solid transparent',
                        transition: 'background-color 0.12s ease',
                      }}
                    >
                      {/* N° Serie / Placa RUMP */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div
                          className="font-mono"
                          style={{
                            fontWeight: 700,
                            color: 'var(--navy-900)',
                            fontSize: '13px',
                          }}
                        >
                          {item.serial}
                        </div>
                        <div
                          className="font-mono microlabel-sm"
                          style={{ color: 'var(--text-muted)', marginTop: '3px' }}
                        >
                          PLACA: {item.placaRump}
                        </div>
                        <div
                          className="microlabel-sm font-mono"
                          style={{ color: 'var(--blue-600)', marginTop: '2px' }}
                        >
                          {item.hsmKey}
                        </div>
                      </td>

                      {/* Establecimiento & NIT */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {item.establecimiento}
                        </div>
                        <div
                          className="font-mono"
                          style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}
                        >
                          NIT: {item.nit}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.municipio}, {item.departamento}
                        </div>
                      </td>

                      {/* Tipo / Irregularidad */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {item.tipoInstrumento}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: isRowCritical ? 'var(--danger)' : 'var(--text-muted)',
                            fontWeight: isRowCritical ? 600 : 400,
                            marginTop: '3px',
                          }}
                        >
                          {item.irregularidad}
                        </div>
                        <div className="font-mono microlabel-sm" style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          PRECINTO: {item.precintoSIMEL}
                        </div>
                      </td>

                      {/* Detección & Sistema */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.deteccionSistema}
                        </div>
                        <div
                          className="font-mono"
                          style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}
                        >
                          {item.timestampDeteccion}
                        </div>
                        <div className="microlabel-sm font-mono" style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          OEC: {item.oecAcreditado}
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span className={`status-pill ${getStatusPillClass(item.estado)}`}>
                          {item.estado}
                        </span>
                      </td>

                      {/* Acción Operativa */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedInstrument(item)}
                          className="btn-gov-compact"
                          title={`Ver expediente forense de ${item.serial}`}
                        >
                          <EyeIcon size={12} />
                          <span>Expediente</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginador oficial y sumario de tabla */}
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>
                PROTOCOLO DE CONTROL FORENSE NTC 2031 · LEY 1480 DE 2011 · SUPERINTENDENCIA DE INDUSTRIA Y COMERCIO
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>PÁGINA 1 DE 216</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled
                    className="btn-gov-compact"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    ANTERIOR
                  </button>
                  <button
                    type="button"
                    className="btn-gov-compact"
                    onClick={() => alert('Cargando registros siguientes desde el nodo central SICM-COL...')}
                  >
                    SIGUIENTE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalle */}
        <InspectionDetailModal
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      </div>
    </section>
  );
};
