import React from 'react';
import { FilterIcon, RotateCcwIcon, SearchIcon, BalanceIcon } from '../common/Icons';
import type { FilterCriteria } from '../../types/metrology';

interface ForensicFiltersProps {
  filters: FilterCriteria;
  onFilterChange: (field: keyof FilterCriteria, value: string) => void;
  onReset: () => void;
  onApply: () => void;
}

export const ForensicFilters: React.FC<ForensicFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onApply,
}) => {
  return (
    <section
      aria-label="Filtro Forense Multicriterio de Metrología Legal"
      style={{
        paddingBottom: '24px',
      }}
    >
      <div className="gov-container">
        <div
          className="gov-card"
          style={{
            padding: '20px 24px',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Encabezado del panel con icono, título institucional y restablecer filtros */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '14px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  color: 'var(--navy-900)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FilterIcon size={18} strokeWidth={1.75} />
              </div>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--navy-900)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Filtro Forense Multicriterio de Metrología Legal
              </h2>
            </div>

            <button
              type="button"
              onClick={onReset}
              className="microlabel"
              style={{
                color: 'var(--blue-600)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)',
                transition: 'all 0.15s ease',
              }}
              title="Limpiar todos los criterios y volver al censo completo"
            >
              <RotateCcwIcon size={12} strokeWidth={2} />
              <span>RESTABLECER FILTROS</span>
            </button>
          </div>

          {/* Rejilla de campos de filtro */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            {/* Campo 1: Serial o Placa RUMP */}
            <div>
              <label
                htmlFor="filter-serial"
                className="microlabel"
                style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}
              >
                N° SERIE / PLACA RUMP
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <SearchIcon size={15} />
                </div>
                <input
                  id="filter-serial"
                  type="text"
                  value={filters.busquedaGeneral}
                  onChange={(e) => onFilterChange('busquedaGeneral', e.target.value)}
                  placeholder="Ej. BAL-2025 o RUMP-CO-..."
                  className="font-mono"
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Campo 2: Irregularidad o Hallazgo */}
            <div>
              <label
                htmlFor="filter-irregularity"
                className="microlabel"
                style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}
              >
                TIPO / HALLAZGO METROLÓGICO
              </label>
              <select
                id="filter-irregularity"
                value={filters.tipoIrregularidad}
                onChange={(e) => onFilterChange('tipoIrregularidad', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">TODAS LAS CONDICIONES TÉCNICAS</option>
                <option value="conforme">CONFORME / DENTRO DE EMP (NTC 2031)</option>
                <option value="emp">DESVIACIÓN EMP SUPERADA (&gt; 1.5e)</option>
                <option value="precinto">PRECINTO SIMEL ALTERADO / VIOLADO</option>
                <option value="vencido">VENCIMIENTO DE CALIBRACIÓN (&gt; 30 DÍAS)</option>
                <option value="excentricidad">ERROR EN ENSAYO DE EXCENTRICIDAD</option>
              </select>
            </div>

            {/* Campo 3: Estado Legal */}
            <div>
              <label
                htmlFor="filter-status"
                className="microlabel"
                style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}
              >
                ESTADO LEGAL DEL CICLO
              </label>
              <select
                id="filter-status"
                value={filters.estadoLegal}
                onChange={(e) => onFilterChange('estadoLegal', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">TODOS LOS ESTADOS REGULATORIOS</option>
                <option value="VIGENTE (APTO)">VIGENTE (APTO)</option>
                <option value="POR VENCER (<30 DÍAS)">POR VENCER (&lt;30 DÍAS)</option>
                <option value="VENCIDO / NO APTO">VENCIDO / NO APTO</option>
                <option value="PENDIENTE REVISIÓN">PENDIENTE REVISIÓN</option>
                <option value="CRÍTICA (MEDIDA INMEDIATA)">CRÍTICA (MEDIDA INMEDIATA)</option>
                <option value="SUSPENDIDA (CONTROL CAUTELAR)">SUSPENDIDA (CONTROL CAUTELAR)</option>
              </select>
            </div>

            {/* Campo 4: Jurisdicción Regional */}
            <div>
              <label
                htmlFor="filter-jurisdiction"
                className="microlabel"
                style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}
              >
                JURISDICCIÓN / NODO REGIONAL
              </label>
              <select
                id="filter-jurisdiction"
                value={filters.jurisdiccion}
                onChange={(e) => onFilterChange('jurisdiccion', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">TODOS LOS NODOS REGIONALES</option>
                <option value="Bogotá D.C.">NODO BOG-01 · BOGOTÁ D.C. & CUNDINAMARCA</option>
                <option value="Medellín">NODO MED-02 · ANTIOQUIA & EJE CAFETERO</option>
                <option value="Cali">NODO CAL-03 · VALLE DEL CAUCA & PACÍFICO</option>
                <option value="Barranquilla">NODO BAR-04 · REGIÓN CARIBE</option>
                <option value="Bucaramanga">NODO BUC-05 · SANTANDERES & ORIENTE</option>
              </select>
            </div>

            {/* Botón de filtrado navy */}
            <div>
              <button
                type="button"
                className="btn-gov-primary"
                onClick={onApply}
                style={{ width: '100%', height: '38px' }}
              >
                <FilterIcon size={14} />
                <span>Filtrar</span>
              </button>
            </div>
          </div>

          {/* Línea de ayuda con los padrones conectados */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BalanceIcon size={14} style={{ color: 'var(--blue-600)' }} />
              <span>
                <strong style={{ color: 'var(--navy-900)' }}>Padrones Trazables Conectados:</strong>{' '}
                INM-COL-PAT-004 (Masa Clase E2/F1) · NIST-F22 (Frecuencia NIST) · Trazabilidad Acreditada ONAC-18-LAB-042
              </span>
            </div>

            <div className="font-mono microlabel-sm" style={{ color: 'var(--text-muted)' }}>
              HASH VERIFICACIÓN: <span style={{ color: 'var(--navy-900)' }}>e3b0c442...89a1f</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

