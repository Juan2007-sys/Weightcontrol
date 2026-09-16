import React, { useState } from 'react';
import type { MetrologicalInstrument } from '../../types/metrology';
import { BalanceIcon, SearchIcon, EyeIcon } from '../common/Icons';
import { InspectionDetailModal } from '../audit/InspectionDetailModal';

interface InstrumentsListViewProps {
  instruments: MetrologicalInstrument[];
  onNewInstrument: () => void;
}

export const InstrumentsListView: React.FC<InstrumentsListViewProps> = ({
  instruments,
  onNewInstrument,
}) => {
  const [filterState, setFilterState] = useState<string>('todos');
  const [search, setSearch] = useState<string>('');
  const [selectedInstrument, setSelectedInstrument] = useState<MetrologicalInstrument | null>(null);

  const filtered = instruments.filter((item) => {
    const matchesSearch =
      item.serial.toLowerCase().includes(search.toLowerCase()) ||
      item.establecimiento.toLowerCase().includes(search.toLowerCase()) ||
      item.nit.includes(search);

    if (filterState === 'todos') return matchesSearch;
    if (filterState === 'vigente') return matchesSearch && item.estado === 'VIGENTE (APTO)';
    if (filterState === 'por_vencer') return matchesSearch && item.estado === 'POR VENCER (<30 DÍAS)';
    if (filterState === 'vencido') return matchesSearch && (item.estado === 'VENCIDO / NO APTO' || item.estado === 'CRÍTICA (MEDIDA INMEDIATA)');
    return matchesSearch;
  });

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="gov-container">
        {/* Encabezado con Botón de Registrar Nuevo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              borderLeft: '4px solid var(--navy-900)',
              paddingLeft: '18px',
            }}
          >
            <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
              MÓDULO TÉCNICO · CENSO DE EQUIPOS BAJO CUSTODIA (RUMP)
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
              Mis Instrumentos Registrados
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Gestión metrológica, historial de calibraciones y precintos SIMEL del parque de instrumentos inscritos.
            </p>
          </div>

          <button
            type="button"
            className="btn-gov-primary"
            onClick={onNewInstrument}
          >
            <BalanceIcon size={16} />
            <span>Registrar Nuevo Instrumento</span>
          </button>
        </div>

        {/* Barra de Filtros Rápidos */}
        <div
          className="gov-card"
          style={{
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFilterState('todos')}
              className={`btn-gov-compact ${filterState === 'todos' ? 'btn-gov-primary' : ''}`}
            >
              Todos ({instruments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterState('vigente')}
              className={`btn-gov-compact ${filterState === 'vigente' ? 'btn-gov-primary' : ''}`}
            >
              Vigentes Apto
            </button>
            <button
              type="button"
              onClick={() => setFilterState('por_vencer')}
              className={`btn-gov-compact ${filterState === 'por_vencer' ? 'btn-gov-primary' : ''}`}
            >
              Por Vencer (&lt;30d)
            </button>
            <button
              type="button"
              onClick={() => setFilterState('vencido')}
              className={`btn-gov-compact ${filterState === 'vencido' ? 'btn-gov-primary' : ''}`}
            >
              Vencidos / Medidas
            </button>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <div
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SearchIcon size={14} />
            </div>
            <input
              type="text"
              placeholder="Buscar por serial, NIT o titular..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--border-strong)',
                fontSize: '12px',
              }}
            />
          </div>
        </div>

        {/* Tabla Simplificada de Instrumentos */}
        <div
          className="gov-card"
          style={{
            overflowX: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--navy-900)', color: '#FFFFFF' }}>
              <tr>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>SERIAL / PLACA</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>ESTABLECIMIENTO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>ESPECIFICACIONES</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>PRECINTO SIMEL</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF', textAlign: 'center' }}>ESTADO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{item.serial}</div>
                    <div className="font-mono microlabel-sm" style={{ color: 'var(--text-muted)' }}>{item.placaRump}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{item.establecimiento}</div>
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NIT: {item.nit}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>{item.tipoInstrumento}</div>
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.capacidadMax} · {item.divisionEscala}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="font-mono" style={{ fontWeight: 600 }}>{item.precintoSIMEL}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className={`status-pill ${item.estado.includes('VIGENTE') ? 'ok' : item.estado.includes('POR VENCER') ? 'warn' : 'danger'}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-gov-compact"
                      onClick={() => setSelectedInstrument(item)}
                    >
                      <EyeIcon size={12} />
                      <span>Ver Ficha</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <InspectionDetailModal
          instrument={selectedInstrument}
          onClose={() => setSelectedInstrument(null)}
        />
      </div>
    </div>
  );
};
