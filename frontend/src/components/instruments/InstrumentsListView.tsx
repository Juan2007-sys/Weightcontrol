import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { MetrologicalInstrument } from '../../types/metrology';
import { BalanceIcon, SearchIcon, EyeIcon, EditIcon, RotateCcwIcon } from '../common/Icons';
import { InspectionDetailModal } from '../audit/InspectionDetailModal';
import { EquipmentHistoryModal } from './EquipmentHistoryModal';
import { EditInstrumentModal } from './EditInstrumentModal';
import { EvidenceManagerModal } from './EvidenceManagerModal';
import { ToggleActiveModal } from './ToggleActiveModal';
import { useAuth } from '../../context/AuthContext';
import { instrumentosService } from '../../services/instrumentos.service';
import { mapBackendInstrumentToFrontend } from '../../services/mappers';
import type { BackendInstrumento } from '../../services/mappers';
import { formatCalendarDate, formatDateTime } from '../../utils/dates';

interface InstrumentsListViewProps {
  /** Se conserva por compatibilidad con App; la lista consulta al servidor con los filtros aplicados. */
  instruments?: MetrologicalInstrument[];
  /** Sin valor, el rol no puede registrar y el boton no se muestra. */
  onNewInstrument?: () => void;
  onRefresh?: () => void;
  onDeleteInstrument?: (id: string) => void;
}

interface Filters {
  search: string;
  marca: string;
  tipo: string;
  categoriaExactitud: string;
  estado: string;
  unidadMedida: string;
  capacidadDesde: string;
  capacidadHasta: string;
  registroDesde: string;
  registroHasta: string;
  activo: '' | 'true' | 'false';
}

const EMPTY: Filters = {
  search: '',
  marca: '',
  tipo: '',
  categoriaExactitud: '',
  estado: '',
  unidadMedida: '',
  capacidadDesde: '',
  capacidadHasta: '',
  registroDesde: '',
  registroHasta: '',
  activo: '',
};

const PAGE_SIZE = 25;

const field: React.CSSProperties = { display: 'grid', gap: '3px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' };
const control: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-input)',
  fontSize: '12px',
  fontWeight: 400,
  color: 'var(--text-primary)',
  backgroundColor: '#FFFFFF',
};
const th: React.CSSProperties = { padding: '12px 14px', color: '#FFFFFF' };
const td: React.CSSProperties = { padding: '11px 14px', verticalAlign: 'middle' };

const pillClass = (estado: string) =>
  estado === 'Vigente' ? 'ok' : estado === 'Por vencer' ? 'warn' : 'danger';

const buildParams = (f: Filters, page: number) => {
  const p: Record<string, any> = { page, limit: PAGE_SIZE };
  (['search', 'marca', 'tipo', 'categoriaExactitud', 'estado', 'unidadMedida', 'registroDesde', 'registroHasta', 'activo'] as const).forEach(
    (k) => {
      if (f[k]) p[k] = f[k];
    },
  );
  if (f.capacidadDesde !== '') p.capacidadDesde = Number(f.capacidadDesde);
  if (f.capacidadHasta !== '') p.capacidadHasta = Number(f.capacidadHasta);
  return p;
};

export const InstrumentsListView: React.FC<InstrumentsListViewProps> = ({ onNewInstrument, onRefresh }) => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const canEdit = user?.rol === 'ADMIN' || user?.rol === 'TECNICO';

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BackendInstrumento[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ficha, setFicha] = useState<MetrologicalInstrument | null>(null);
  const [historial, setHistorial] = useState<BackendInstrumento | null>(null);
  const [editando, setEditando] = useState<BackendInstrumento | null>(null);
  const [evidencias, setEvidencias] = useState<BackendInstrumento | null>(null);
  const [toggle, setToggle] = useState<BackendInstrumento | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await instrumentosService.getAll(buildParams(applied, page));
      setRows(res.raw);
      setTotal(res.total);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No fue posible consultar los instrumentos.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshAll = () => {
    load();
    onRefresh?.();
  };

  const setField = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  };

  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = useMemo(() => Object.values(applied).filter((v) => v !== '').length, [applied]);
  const idOf = (r: BackendInstrumento) => r.id || r._id || r.serial;
  const unidad = (r: BackendInstrumento) => r.unidadMedida || 'kg';

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="gov-container">
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}
        >
          <div style={{ borderLeft: '4px solid var(--navy-900)', paddingLeft: '18px' }}>
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
              Consulta, filtros, historial, edición, inactivación y evidencias fotográficas de los equipos inscritos.
            </p>
          </div>
          {onNewInstrument && (
            <button type="button" className="btn-gov-primary" onClick={onNewInstrument}>
              <BalanceIcon size={16} />
              <span>Registrar Nuevo Instrumento</span>
            </button>
          )}
        </div>

        {/* HU-10: filtros de equipos */}
        <form
          onSubmit={apply}
          className="gov-card"
          aria-label="Filtros de equipos"
          data-testid="filtros-equipos"
          style={{ padding: '16px 20px', marginBottom: '20px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <label style={field}>
              Número de serie / búsqueda
              <span style={{ position: 'relative', display: 'block' }}>
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <SearchIcon size={13} />
                </span>
                <input
                  style={{ ...control, paddingLeft: 28, width: '100%' }}
                  value={draft.search}
                  onChange={setField('search')}
                  placeholder="Serial, titular, NIT…"
                />
              </span>
            </label>
            <label style={field}>
              Marca
              <input style={control} value={draft.marca} onChange={setField('marca')} placeholder="Ej. Torrey" />
            </label>
            <label style={field}>
              Tipo de equipo
              <select style={control} value={draft.tipo} onChange={setField('tipo')}>
                <option value="">Todos</option>
                <option value="Bascula">Báscula</option>
                <option value="Pesa">Pesa</option>
                <option value="Dinamometro">Dinamómetro</option>
              </select>
            </label>
            <label style={field}>
              Clase de exactitud
              <select style={control} value={draft.categoriaExactitud} onChange={setField('categoriaExactitud')}>
                <option value="">Todas</option>
                <option>Clase I</option>
                <option>Clase II</option>
                <option>Clase III</option>
                <option>Clase IIII</option>
              </select>
            </label>
            <label style={field}>
              Estado metrológico
              <select style={control} value={draft.estado} onChange={setField('estado')}>
                <option value="">Todos</option>
                <option value="Vigente">Vigente</option>
                <option value="Por vencer">Por vencer</option>
                <option value="Vencido">Vencido</option>
              </select>
            </label>
            <label style={field}>
              Estado operativo
              <select style={control} value={draft.activo} onChange={setField('activo')}>
                <option value="">Activos e inactivos</option>
                <option value="true">Solo activos</option>
                <option value="false">Solo inactivos</option>
              </select>
            </label>
            <label style={field}>
              Unidad de medida
              <select style={control} value={draft.unidadMedida} onChange={setField('unidadMedida')}>
                <option value="">Todas</option>
                {['g', 'kg', 't', 'lb', 'N', 'kN'].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            <label style={field}>
              Capacidad máxima desde
              <input style={control} type="number" min="0" step="any" value={draft.capacidadDesde} onChange={setField('capacidadDesde')} />
            </label>
            <label style={field}>
              Capacidad máxima hasta
              <input style={control} type="number" min="0" step="any" value={draft.capacidadHasta} onChange={setField('capacidadHasta')} />
            </label>
            <label style={field}>
              Registrado desde
              <input style={control} type="date" value={draft.registroDesde} onChange={setField('registroDesde')} />
            </label>
            <label style={field}>
              Registrado hasta
              <input style={control} type="date" value={draft.registroHasta} onChange={setField('registroHasta')} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="btn-gov-primary">
              <SearchIcon size={13} />
              <span>Aplicar filtros</span>
            </button>
            <button type="button" className="btn-gov-compact" onClick={clear}>
              <RotateCcwIcon size={12} />
              <span>Limpiar</span>
            </button>
            <span role="status" style={{ fontSize: '12px', color: 'var(--text-muted)' }} data-testid="resultado-conteo">
              {loading ? 'Consultando…' : `${total} equipo${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}
              {activeFilterCount > 0 && ` · ${activeFilterCount} filtro${activeFilterCount === 1 ? '' : 's'} activo${activeFilterCount === 1 ? '' : 's'}`}
            </span>
          </div>
        </form>

        {error && (
          <div role="alert" className="status-pill danger" style={{ display: 'block', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <div className="gov-card" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }} data-testid="tabla-equipos">
            <thead style={{ backgroundColor: 'var(--navy-900)', color: '#FFFFFF' }}>
              <tr>
                <th scope="col" className="microlabel" style={th}>SERIAL</th>
                <th scope="col" className="microlabel" style={th}>MARCA</th>
                <th scope="col" className="microlabel" style={th}>TIPO</th>
                <th scope="col" className="microlabel" style={{ ...th, textAlign: 'right' }}>CAP. MÍNIMA</th>
                <th scope="col" className="microlabel" style={{ ...th, textAlign: 'right' }}>CAP. MÁXIMA</th>
                <th scope="col" className="microlabel" style={{ ...th, textAlign: 'center' }}>ESTADO</th>
                <th scope="col" className="microlabel" style={th}>FECHA DE REGISTRO</th>
                <th scope="col" className="microlabel" style={{ ...th, textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
                    No hay equipos que cumplan los filtros indicados.
                  </td>
                </tr>
              )}
              {rows.map((r, idx) => {
                const inactivo = r.activo === false;
                return (
                  <tr
                    key={idOf(r)}
                    data-testid="fila-equipo"
                    style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB', opacity: inactivo ? 0.8 : 1 }}
                  >
                    <td style={td}>
                      <div className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{r.serial}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.modelo}</div>
                    </td>
                    <td style={td}>{r.marca}</td>
                    <td style={td}>
                      {r.tipo}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.categoriaExactitud}</div>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }} className="font-mono">{r.capacidadMinima ?? 0} {unidad(r)}</td>
                    <td style={{ ...td, textAlign: 'right' }} className="font-mono">{r.capacidadMaxima} {unidad(r)}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span className={`status-pill ${pillClass(r.estado)}`}>{r.estado}</span>
                      {inactivo && (
                        <div style={{ marginTop: 4 }}>
                          <span className="status-pill danger" data-testid="badge-inactivo" title={r.motivoInactivacion}>
                            INACTIVO
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      {formatCalendarDate(r.createdAt)}
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.createdAt ? formatDateTime(r.createdAt) : ''}</div>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn-gov-compact" onClick={() => setFicha(mapBackendInstrumentToFrontend(r))}>
                          <EyeIcon size={12} />
                          <span>Ficha</span>
                        </button>
                        <button type="button" className="btn-gov-compact" onClick={() => setHistorial(r)}>
                          Historial
                        </button>
                        <button type="button" className="btn-gov-compact" onClick={() => setEvidencias(r)}>
                          Evidencias
                        </button>
                        {canEdit && (
                          <button type="button" className="btn-gov-compact" onClick={() => setEditando(r)}>
                            <EditIcon size={12} />
                            <span>Editar</span>
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-gov-compact"
                            onClick={() => setToggle(r)}
                            style={inactivo ? undefined : { color: '#DC2626', borderColor: '#FCA5A5' }}
                          >
                            {inactivo ? 'Reactivar' : 'Inactivar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <nav aria-label="Paginación" style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', marginTop: '14px' }}>
            <button type="button" className="btn-gov-compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span style={{ fontSize: '12px' }}>
              Página {page} de {totalPages}
            </span>
            <button type="button" className="btn-gov-compact" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </nav>
        )}

        <InspectionDetailModal instrument={ficha} onClose={() => setFicha(null)} />

        {historial && <EquipmentHistoryModal instrumentId={idOf(historial)} serial={historial.serial} onClose={() => setHistorial(null)} />}
        {editando && (
          <EditInstrumentModal
            item={editando}
            onClose={() => setEditando(null)}
            onSaved={() => {
              setEditando(null);
              refreshAll();
            }}
          />
        )}
        {evidencias && (
          <EvidenceManagerModal
            instrumentId={idOf(evidencias)}
            serial={evidencias.serial}
            canEdit={canEdit}
            onClose={() => setEvidencias(null)}
            onChanged={refreshAll}
          />
        )}
        {toggle && (
          <ToggleActiveModal
            id={idOf(toggle)}
            serial={toggle.serial}
            activo={toggle.activo !== false}
            onClose={() => setToggle(null)}
            onDone={() => {
              setToggle(null);
              refreshAll();
            }}
          />
        )}
      </div>
    </div>
  );
};
