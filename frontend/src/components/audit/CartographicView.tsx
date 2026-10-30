import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { MapPinIcon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import type { MetrologicalInstrument } from '../../types/metrology';
import { DANE_POR_ZONA, SIN_UBICACION, zonaDeDepartamento } from '../../utils/territorio';
import colombiaGeo from '../../data/colombia-departamentos.json';

/* ------------------------------------------------------------------------------------------------
   Geometria: poligonos de los 33 departamentos (DANE / MGN 2018, licencia MIT, simplificados).
   Se calcula una sola vez: no depende de los equipos.
   ------------------------------------------------------------------------------------------------ */
type Dpto = Feature<Geometry, { code: string }>;
const TODOS = (colombiaGeo as unknown as FeatureCollection<Geometry, { code: string }>).features as Dpto[];
const ISLA = TODOS.find((f) => f.properties.code === '88')!;
const CONTINENTE = TODOS.filter((f) => f.properties.code !== '88');

const W = 560;
const H = 640;
const proyeccion = geoMercator().fitExtent([[12, 12], [W - 12, H - 12]], { type: 'FeatureCollection', features: CONTINENTE });
const trazar = geoPath(proyeccion);
const INSET = { x: 14, y: 14, w: 92, h: 168 };
const proyeccionIsla = geoMercator().fitExtent(
  [[INSET.x + 12, INSET.y + 34], [INSET.x + INSET.w - 12, INSET.y + INSET.h - 12]],
  ISLA,
);
const trazarIsla = geoPath(proyeccionIsla);

const POLIGONOS = CONTINENTE.map((f) => ({ code: f.properties.code, d: trazar(f) ?? '', feature: f }));
const ISLA_D = trazarIsla(ISLA) ?? '';

/** Posicion (en el SVG) del centro de una zona, a partir de sus poligonos. */
function centroDeZona(clave: string): [number, number] | null {
  const codes = DANE_POR_ZONA[clave];
  if (!codes) return null;
  if (clave === 'san-andres') return proyeccionIsla(geoCentroid(ISLA)) as [number, number];
  const feats = CONTINENTE.filter((f) => codes.includes(f.properties.code));
  if (feats.length === 0) return null;
  return proyeccion(geoCentroid({ type: 'FeatureCollection', features: feats })) as [number, number];
}

interface Vista {
  x: number;
  y: number;
  w: number;
  h: number;
}
const VISTA_TOTAL: Vista = { x: 0, y: 0, w: W, h: H };
const ANCHO_MIN = 150; // zoom maximo

/** Recuadro del SVG que encuadra una zona con margen. */
function vistaDeZona(clave: string): Vista {
  const codes = DANE_POR_ZONA[clave];
  if (!codes) return VISTA_TOTAL;
  if (clave === 'san-andres') return VISTA_TOTAL; // tiene su propio recuadro fijo
  const feats = CONTINENTE.filter((f) => codes.includes(f.properties.code));
  if (feats.length === 0) return VISTA_TOTAL;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of feats) {
    const [[a, b], [c, d]] = trazar.bounds(f);
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  return encuadrar(x0, y0, x1, y1, 0.9);
}

function encuadrar(x0: number, y0: number, x1: number, y1: number, margen: number): Vista {
  const bw = x1 - x0;
  const bh = y1 - y0;
  let w = Math.max(ANCHO_MIN, bw * (1 + margen), (bh * (1 + margen) * W) / H);
  w = Math.min(w, W);
  const h = (w * H) / W;
  const x = Math.min(Math.max((x0 + x1) / 2 - w / 2, 0), W - w);
  const y = Math.min(Math.max((y0 + y1) / 2 - h / 2, 0), H - h);
  return { x, y, w, h };
}

/* ------------------------------------------------------------------------------------------------
   Indicadores por zona (datos reales)
   ------------------------------------------------------------------------------------------------ */
type EstadoZona = 'OPTIMO' | 'ALERTA' | 'CRITICO';

interface Zona {
  clave: string;
  nombre: string;
  total: number;
  vigentes: number;
  porVencer: number;
  criticos: number;
  conformidad: number;
  estado: EstadoZona;
  municipios: Array<{ nombre: string; total: number }>;
  atencion: MetrologicalInstrument[];
}

const esCritico = (e: string) =>
  e === 'VENCIDO / NO APTO' || e === 'CRÍTICA (MEDIDA INMEDIATA)' || e === 'SUSPENDIDA (CONTROL CAUTELAR)' || e === 'RECHAZADA / OBSERVADA';

function construirZonas(instruments: MetrologicalInstrument[]): Zona[] {
  const grupos = new Map<string, { nombre: string; items: MetrologicalInstrument[] }>();
  for (const item of instruments) {
    const { clave, nombre } = zonaDeDepartamento(item.departamento);
    const g = grupos.get(clave) ?? { nombre, items: [] };
    g.items.push(item);
    grupos.set(clave, g);
  }

  const zonas: Zona[] = [...grupos.entries()].map(([clave, g]) => {
    const total = g.items.length;
    const vigentes = g.items.filter((i) => i.estado === 'VIGENTE (APTO)').length;
    const porVencer = g.items.filter((i) => i.estado === 'POR VENCER (<30 DÍAS)').length;
    const criticos = g.items.filter((i) => esCritico(i.estado)).length;
    const porMunicipio = new Map<string, number>();
    for (const i of g.items) {
      const m = i.municipio && i.municipio !== SIN_UBICACION ? i.municipio : 'Sin municipio';
      porMunicipio.set(m, (porMunicipio.get(m) ?? 0) + 1);
    }
    return {
      clave,
      nombre: g.nombre,
      total,
      vigentes,
      porVencer,
      criticos,
      conformidad: total ? Math.round((vigentes / total) * 1000) / 10 : 0,
      estado: total > 0 && criticos / total >= 0.5 ? 'CRITICO' : criticos > 0 || porVencer > 0 ? 'ALERTA' : 'OPTIMO',
      municipios: [...porMunicipio.entries()].map(([nombre, t]) => ({ nombre, total: t })).sort((a, b) => b.total - a.total),
      atencion: g.items.filter((i) => esCritico(i.estado) || i.estado === 'POR VENCER (<30 DÍAS)'),
    };
  });
  return zonas.sort((a, b) => b.criticos - a.criticos || b.porVencer - a.porVencer || b.total - a.total);
}

/* Colores: solidos con contraste >= 4.5:1 para el texto blanco; tintes para el relleno del mapa. */
const COLOR: Record<EstadoZona, { solido: string; tinte: string; etiqueta: string; pill: string }> = {
  OPTIMO: { solido: '#047857', tinte: '#9FD9BD', etiqueta: 'Óptimo', pill: 'ok' },
  ALERTA: { solido: '#B45309', tinte: '#F5D183', etiqueta: 'Alerta', pill: 'warn' },
  CRITICO: { solido: '#B91C1C', tinte: '#F0A3A3', etiqueta: 'Crítico', pill: 'danger' },
};
const SIN_EQUIPOS = '#DCE4EE';
const ESTADOS: EstadoZona[] = ['OPTIMO', 'ALERTA', 'CRITICO'];

const etiquetaCorta = (clave: string, nombre: string) => (clave === 'bogota' ? 'Bogotá y Cund.' : nombre);

const ocultoVisualmente: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

interface CartographicViewProps {
  /** Equipos reales ya cargados (el mismo conjunto que alimenta la matriz). */
  instruments: MetrologicalInstrument[];
  /** Abre el expediente de un equipo. */
  onOpenInstrument?: (item: MetrologicalInstrument) => void;
}

const kpi: React.CSSProperties = { display: 'grid', gap: '2px' };
const kpiNum: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 800, lineHeight: 1.1 };
const botonControl: React.CSSProperties = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  backgroundColor: '#FFFFFF',
  color: 'var(--navy-900)',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15,27,45,0.12)',
};

export const CartographicView: React.FC<CartographicViewProps> = ({ instruments, onOpenInstrument }) => {
  const { isAuthenticated } = useAuth();
  const zonas = useMemo(() => construirZonas(instruments), [instruments]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [resaltar, setResaltar] = useState<EstadoZona | null>(null);
  const [vista, setVista] = useState<Vista>(VISTA_TOTAL);
  const vistaRef = useRef<Vista>(VISTA_TOTAL);
  const animRef = useRef<number | null>(null);
  const envolturaRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const porClave = useMemo(() => new Map(zonas.map((z) => [z.clave, z])), [zonas]);
  const porCodigo = useMemo(() => {
    const m = new Map<string, Zona>();
    for (const z of zonas) for (const c of DANE_POR_ZONA[z.clave] ?? []) m.set(c, z);
    return m;
  }, [zonas]);

  const actual = porClave.get(seleccion ?? '') ?? zonas[0];
  const claveActual = actual?.clave;

  /* ---- Zoom animado (respeta "reducir movimiento") ---- */
  const irAVista = useCallback((destino: Vista) => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    const origen = vistaRef.current;
    const reducir = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducir) {
      vistaRef.current = destino;
      setVista(destino);
      return;
    }
    const t0 = performance.now();
    const DURACION = 450;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / DURACION);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
      const v: Vista = {
        x: origen.x + (destino.x - origen.x) * e,
        y: origen.y + (destino.y - origen.y) * e,
        w: origen.w + (destino.w - origen.w) * e,
        h: origen.h + (destino.h - origen.h) * e,
      };
      vistaRef.current = v;
      setVista(v);
      animRef.current = t < 1 ? requestAnimationFrame(paso) : null;
    };
    animRef.current = requestAnimationFrame(paso);
  }, []);

  useEffect(() => () => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
  }, []);

  const seleccionar = useCallback(
    (clave: string) => {
      setSeleccion(clave);
      irAVista(vistaDeZona(clave));
    },
    [irAVista],
  );

  const escalar = (factor: number) => {
    const v = vistaRef.current;
    const w = Math.min(W, Math.max(ANCHO_MIN, v.w / factor));
    const h = (w * H) / W;
    const x = Math.min(Math.max(v.x + v.w / 2 - w / 2, 0), W - w);
    const y = Math.min(Math.max(v.y + v.h / 2 - h / 2, 0), H - h);
    irAVista({ x, y, w, h });
  };

  /* ---- Tooltip flotante: se posiciona sin re-render y no recibe el cursor (no hay parpadeo) ---- */
  const posicionarTooltip = (clientX: number, clientY: number) => {
    const caja = envolturaRef.current?.getBoundingClientRect();
    const tip = tooltipRef.current;
    if (!caja || !tip) return;
    const ancho = tip.offsetWidth || 220;
    let x = clientX - caja.left + 14;
    let y = clientY - caja.top + 14;
    if (x + ancho > caja.width - 4) x = clientX - caja.left - ancho - 14;
    if (y + tip.offsetHeight > caja.height - 4) y = clientY - caja.top - tip.offsetHeight - 14;
    tip.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  };

  if (zonas.length === 0) {
    return (
      <div className="gov-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No hay equipos para distribuir por territorio.
      </div>
    );
  }

  const enHover = porClave.get(hover ?? '');
  const sinUbicacionTodo = zonas.every((z) => z.clave === 'sin-ubicacion');
  const k = W / vista.w; // factor de zoom actual

  const total = instruments.length;
  const vigentes = zonas.reduce((a, z) => a + z.vigentes, 0);
  const porVencer = zonas.reduce((a, z) => a + z.porVencer, 0);
  const criticos = zonas.reduce((a, z) => a + z.criticos, 0);
  const pct = total ? Math.round((vigentes / total) * 1000) / 10 : 0;
  const conPoligono = zonas.filter((z) => z.clave in DANE_POR_ZONA);
  const opacidad = (z?: Zona) => (resaltar && z && z.estado !== resaltar ? 0.28 : 1);

  const zoomActivo = vista.w < W - 0.5;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Anuncio para lectores de pantalla: solo cambia al seleccionar, no al pasar el cursor */}
      <p aria-live="polite" style={ocultoVisualmente}>
        {actual.clave === 'sin-ubicacion'
          ? 'Equipos sin ubicación registrada'
          : `Zona seleccionada: ${actual.nombre}, ${actual.total} equipos, ${actual.conformidad}% vigentes`}
      </p>

      {/* Indicadores nacionales (calculados con los equipos registrados) */}
      <div
        className="gov-card"
        style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}
      >
        <div style={kpi}>
          <span className="microlabel" style={{ color: 'var(--text-muted)' }}>EQUIPOS REGISTRADOS</span>
          <span style={{ ...kpiNum, color: 'var(--navy-900)' }}>{total}</span>
        </div>
        <div style={kpi}>
          <span className="microlabel" style={{ color: 'var(--text-muted)' }}>ZONAS CON EQUIPOS</span>
          <span style={{ ...kpiNum, color: 'var(--navy-900)' }}>{conPoligono.length}</span>
        </div>
        <div style={kpi}>
          <span className="microlabel" style={{ color: 'var(--text-muted)' }}>VIGENTES</span>
          <span style={{ ...kpiNum, color: 'var(--ok)' }}>{pct}%</span>
        </div>
        <div style={kpi}>
          <span className="microlabel" style={{ color: 'var(--text-muted)' }}>POR VENCER</span>
          <span style={{ ...kpiNum, color: porVencer > 0 ? 'var(--warn)' : 'var(--navy-900)' }}>{porVencer}</span>
        </div>
        <div style={kpi}>
          <span className="microlabel" style={{ color: 'var(--text-muted)' }}>VENCIDOS / NO APTOS</span>
          <span style={{ ...kpiNum, color: criticos > 0 ? 'var(--danger)' : 'var(--navy-900)' }}>{criticos}</span>
        </div>
      </div>

      {sinUbicacionTodo && (
        <div role="note" style={{ fontSize: '13px', padding: '12px 14px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-card)', backgroundColor: '#F8FAFC' }}>
          {isAuthenticated
            ? 'Estos equipos no tienen departamento registrado, por eso no se pueden ubicar en el mapa.'
            : 'La ubicación del propietario es un dato reservado. Inicie sesión para ver la distribución por departamento en el mapa.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {/* ===== Mapa ===== */}
        <div className="gov-card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <div className="microlabel" style={{ color: 'var(--navy-900)' }}>MAPA DE COLOMBIA · ESTADO POR DEPARTAMENTO</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Haga clic en una zona para ver el detalle</div>
          </div>

          {/* Envoltura con altura propia: nada de lo que cambie al pasar el cursor mueve el mapa */}
          <div
            ref={envolturaRef}
            onMouseMove={(e) => hover && posicionarTooltip(e.clientX, e.clientY)}
            style={{ position: 'relative', width: '100%', maxWidth: '560px', justifySelf: 'center', aspectRatio: `${W} / ${H}`, borderRadius: 10, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px #D5E0EC' }}
          >
            <svg
              viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
              role="group"
              aria-label="Mapa de Colombia: cada departamento se colorea según el estado de sus equipos"
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              <defs>
                <linearGradient id="mapa-mar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F4F8FC" />
                  <stop offset="100%" stopColor="#E1ECF7" />
                </linearGradient>
                <filter id="mapa-sombra" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0B1F3F" floodOpacity="0.35" />
                </filter>
              </defs>
              <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#mapa-mar)" />

              {/* Departamentos */}
              <g aria-hidden="true">
                {POLIGONOS.map((p) => {
                  const z = porCodigo.get(p.code);
                  if (z && z.clave === claveActual) return null; // el seleccionado se dibuja al final
                  return (
                    <path
                      key={p.code}
                      d={p.d}
                      fill={z ? COLOR[z.estado].tinte : SIN_EQUIPOS}
                      fillOpacity={opacidad(z)}
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                      style={{ cursor: z ? 'pointer' : 'default', transition: 'fill-opacity 0.2s' }}
                      onClick={z ? () => seleccionar(z.clave) : undefined}
                      onMouseEnter={z ? (e) => { setHover(z.clave); requestAnimationFrame(() => posicionarTooltip(e.clientX, e.clientY)); } : undefined}
                      onMouseLeave={z ? () => setHover(null) : undefined}
                    />
                  );
                })}
                {POLIGONOS.filter((p) => porCodigo.get(p.code)?.clave === claveActual).map((p) => (
                  <path
                    key={`sel-${p.code}`}
                    d={p.d}
                    fill={COLOR[actual.estado].tinte}
                    stroke="#0B1F3F"
                    strokeWidth="2.4"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    filter="url(#mapa-sombra)"
                    style={{ cursor: 'pointer' }}
                    onClick={() => seleccionar(actual.clave)}
                    onMouseEnter={(e) => { setHover(actual.clave); requestAnimationFrame(() => posicionarTooltip(e.clientX, e.clientY)); }}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>

              {/* Burbujas: una por zona; su tamano indica la cantidad de equipos y se mantiene al hacer zoom */}
              {conPoligono.filter((z) => z.clave !== 'san-andres').map((z) => {
                const c = centroDeZona(z.clave);
                if (!c) return null;
                const r = Math.min(24, 11 + Math.sqrt(z.total) * 3) / Math.sqrt(k);
                const activa = z.clave === claveActual;
                const enfocada = activa || hover === z.clave;
                const mostrarNombre = enfocada || k >= 1.8;
                return (
                  <g
                    key={z.clave}
                    role="button"
                    tabIndex={0}
                    aria-label={`${z.nombre}: ${z.total} ${z.total === 1 ? 'equipo' : 'equipos'}, estado ${COLOR[z.estado].etiqueta.toLowerCase()}`}
                    aria-pressed={activa}
                    opacity={opacidad(z)}
                    onClick={() => seleccionar(z.clave)}
                    onFocus={(e) => {
                      setHover(z.clave);
                      const caja = e.currentTarget.getBoundingClientRect();
                      requestAnimationFrame(() => posicionarTooltip(caja.right, caja.top));
                    }}
                    onBlur={() => setHover(null)}
                    onMouseEnter={(e) => { setHover(z.clave); requestAnimationFrame(() => posicionarTooltip(e.clientX, e.clientY)); }}
                    onMouseLeave={() => setHover(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        seleccionar(z.clave);
                      }
                    }}
                    style={{ cursor: 'pointer', outline: 'none', transition: 'opacity 0.2s' }}
                  >
                    {enfocada && (
                      <circle cx={c[0]} cy={c[1]} r={r + 5 / Math.sqrt(k)} fill="none" stroke="#0B1F3F" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
                    )}
                    <circle cx={c[0]} cy={c[1]} r={r} fill={COLOR[z.estado].solido} stroke="#FFFFFF" strokeWidth="2.5" vectorEffect="non-scaling-stroke" filter="url(#mapa-sombra)" />
                    <text x={c[0]} y={c[1]} dy="0.35em" textAnchor="middle" fontSize={14 / Math.sqrt(k)} fontWeight="800" fill="#FFFFFF" pointerEvents="none">
                      {z.total}
                    </text>
                    {mostrarNombre && (
                      <text
                        x={c[0]}
                        y={c[1] + r + 13 / Math.sqrt(k)}
                        textAnchor="middle"
                        fontSize={11 / Math.sqrt(k)}
                        fontWeight="700"
                        fill="#0B1F3F"
                        stroke="#FFFFFF"
                        strokeWidth={3 / Math.sqrt(k)}
                        paintOrder="stroke"
                        pointerEvents="none"
                      >
                        {etiquetaCorta(z.clave, z.nombre)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Recuadro fijo: San Andres y Providencia (queda lejos de la costa; no se mueve con el zoom) */}
            {(() => {
              const z = porCodigo.get('88');
              const activo = !!z && z.clave === claveActual;
              const c = z ? centroDeZona('san-andres') : null;
              const r = z ? Math.min(24, 11 + Math.sqrt(z.total) * 3) : 0;
              return (
                <svg
                  viewBox={`${INSET.x} ${INSET.y} ${INSET.w} ${INSET.h}`}
                  role="group"
                  aria-label="Recuadro: archipiélago de San Andrés y Providencia"
                  style={{
                    position: 'absolute',
                    left: `${(INSET.x / W) * 100}%`,
                    top: `${(INSET.y / H) * 100}%`,
                    width: `${(INSET.w / W) * 100}%`,
                    height: `${(INSET.h / H) * 100}%`,
                    overflow: 'visible',
                  }}
                >
                  <rect x={INSET.x} y={INSET.y} width={INSET.w} height={INSET.h} rx="6" fill="#FFFFFF" fillOpacity="0.94" stroke="#B8C6D8" vectorEffect="non-scaling-stroke" />
                  <text x={INSET.x + 8} y={INSET.y + 14} fontSize="9.5" fontWeight="600" fill="#3B4A5F">San Andrés y</text>
                  <text x={INSET.x + 8} y={INSET.y + 26} fontSize="9.5" fontWeight="600" fill="#3B4A5F">Providencia</text>
                  <path
                    d={ISLA_D}
                    aria-hidden="true"
                    fill={z ? COLOR[z.estado].tinte : '#B8C4D3'}
                    fillOpacity={opacidad(z)}
                    stroke={activo ? '#0B1F3F' : '#7C8CA3'}
                    strokeWidth={activo ? 2 : 1}
                    vectorEffect="non-scaling-stroke"
                    style={{ cursor: z ? 'pointer' : 'default' }}
                    onClick={z ? () => seleccionar(z.clave) : undefined}
                  />
                  {z && c && (
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`${z.nombre}: ${z.total} ${z.total === 1 ? 'equipo' : 'equipos'}, estado ${COLOR[z.estado].etiqueta.toLowerCase()}`}
                      aria-pressed={activo}
                      opacity={opacidad(z)}
                      onClick={() => seleccionar(z.clave)}
                      onFocus={(e) => {
                        setHover(z.clave);
                        const caja = e.currentTarget.getBoundingClientRect();
                        requestAnimationFrame(() => posicionarTooltip(caja.right, caja.bottom));
                      }}
                      onBlur={() => setHover(null)}
                      onMouseEnter={(e) => { setHover(z.clave); requestAnimationFrame(() => posicionarTooltip(e.clientX, e.clientY)); }}
                      onMouseLeave={() => setHover(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          seleccionar(z.clave);
                        }
                      }}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <circle cx={c[0]} cy={c[1]} r={r} fill={COLOR[z.estado].solido} stroke="#FFFFFF" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                      <text x={c[0]} y={c[1]} dy="0.35em" textAnchor="middle" fontSize="14" fontWeight="800" fill="#FFFFFF" pointerEvents="none">{z.total}</text>
                    </g>
                  )}
                </svg>
              );
            })()}

            {/* Controles de zoom */}
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'grid', gap: 6 }}>
              <button type="button" style={botonControl} onClick={() => escalar(1.6)} aria-label="Acercar el mapa">+</button>
              <button type="button" style={botonControl} onClick={() => escalar(1 / 1.6)} aria-label="Alejar el mapa">−</button>
              <button
                type="button"
                style={{ ...botonControl, fontSize: 12, opacity: zoomActivo ? 1 : 0.5 }}
                onClick={() => irAVista(VISTA_TOTAL)}
                aria-label="Ver todo el país"
                title="Ver todo el país"
              >
                ⤢
              </button>
            </div>

            {/* Tooltip flotante (no recibe el cursor, no ocupa espacio) */}
            <div
              ref={tooltipRef}
              role="presentation"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: 'none',
                opacity: enHover ? 1 : 0,
                transition: 'opacity 0.12s',
                width: 230,
                backgroundColor: '#0B1F3F',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '10px 12px',
                boxShadow: '0 8px 24px rgba(7,20,39,0.35)',
                fontSize: 12,
                zIndex: 5,
              }}
            >
              {enHover && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>{enHover.nombre}</strong>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, backgroundColor: COLOR[enHover.estado].solido }}>
                      {COLOR[enHover.estado].etiqueta.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    {enHover.total} {enHover.total === 1 ? 'equipo' : 'equipos'} · {enHover.conformidad}% vigentes
                  </div>
                  <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <span style={{ width: `${(enHover.vigentes / enHover.total) * 100}%`, backgroundColor: '#34D399' }} />
                    <span style={{ width: `${(enHover.porVencer / enHover.total) * 100}%`, backgroundColor: '#FBBF24' }} />
                    <span style={{ width: `${(enHover.criticos / enHover.total) * 100}%`, backgroundColor: '#F87171' }} />
                  </div>
                  <div style={{ color: '#CBD5E1' }}>
                    {enHover.porVencer} por vencer · {enHover.criticos} vencidos o no aptos
                  </div>
                  <div style={{ color: '#93C5FD', fontSize: 11 }}>Clic para ver el detalle</div>
                </div>
              )}
            </div>
          </div>

          {/* Leyenda interactiva: pasar o enfocar un estado atenua los demas */}
          <div role="group" aria-label="Leyenda del mapa" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {ESTADOS.map((e) => {
              const n = zonas.filter((z) => z.estado === e && z.clave in DANE_POR_ZONA).length;
              const activo = resaltar === e;
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setResaltar(activo ? null : e)}
                  onMouseEnter={() => setResaltar(e)}
                  onMouseLeave={() => setResaltar(null)}
                  onFocus={() => setResaltar(e)}
                  onBlur={() => setResaltar(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: activo ? '1.5px solid var(--navy-900)' : '1px solid var(--border-strong)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text-primary)',
                    font: 'inherit',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLOR[e].solido, display: 'inline-block' }} />
                  {COLOR[e].etiqueta} <strong className="font-mono">{n}</strong>
                </button>
              );
            })}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: SIN_EQUIPOS, border: '1px solid #B8C6D8', display: 'inline-block' }} />
              Sin equipos
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Óptimo: todos vigentes · Alerta: hay equipos por vencer o vencidos · Crítico: la mitad o más vencidos o no aptos. El número de cada burbuja es la cantidad de equipos.
          </p>
        </div>

        {/* ===== Detalle y ranking ===== */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="gov-card" style={{ padding: '16px 18px', display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div className="microlabel" style={{ color: 'var(--text-muted)' }}>ZONA SELECCIONADA</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, color: 'var(--navy-900)', margin: '2px 0 0 0' }}>
                  {actual.nombre}
                </h3>
              </div>
              {actual.clave !== 'sin-ubicacion' && <span className={`status-pill ${COLOR[actual.estado].pill}`}>{COLOR[actual.estado].etiqueta.toUpperCase()}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <div style={kpi}>
                <span className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>EQUIPOS</span>
                <span style={{ ...kpiNum, fontSize: '22px', color: 'var(--navy-900)' }}>{actual.total}</span>
              </div>
              <div style={kpi}>
                <span className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>VIGENTES</span>
                <span style={{ ...kpiNum, fontSize: '22px', color: 'var(--ok)' }}>{actual.conformidad}%</span>
              </div>
              <div style={kpi}>
                <span className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>VENCIDOS</span>
                <span style={{ ...kpiNum, fontSize: '22px', color: actual.criticos > 0 ? 'var(--danger)' : 'var(--navy-900)' }}>{actual.criticos}</span>
              </div>
            </div>

            {actual.municipios.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                <span className="microlabel-sm" style={{ color: 'var(--text-muted)' }}>MUNICIPIOS: </span>
                {actual.municipios.map((m) => `${m.nombre} (${m.total})`).join(' · ')}
              </div>
            )}

            <div>
              <div className="microlabel-sm" style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>EQUIPOS QUE REQUIEREN ATENCIÓN</div>
              {actual.atencion.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ningún equipo de esta zona está vencido ni por vencer.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '6px' }}>
                  {actual.atencion.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => onOpenInstrument?.(i)}
                        className="btn-gov-compact"
                        style={{ width: '100%', justifyContent: 'space-between', display: 'flex', gap: '8px' }}
                      >
                        <span className="font-mono" style={{ fontWeight: 700 }}>{i.serial}</span>
                        <span style={{ color: esCritico(i.estado) ? 'var(--danger)' : 'var(--warn)', fontWeight: 700 }}>{i.estado}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Ranking: las zonas que mas atencion requieren primero */}
          <div className="gov-card" style={{ padding: '14px 16px', display: 'grid', gap: '8px' }}>
            <div className="microlabel" style={{ color: 'var(--navy-900)' }}>ZONAS POR PRIORIDAD DE ATENCIÓN</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '6px' }}>
              {zonas.map((z) => {
                const activa = z.clave === claveActual;
                const w = (n: number) => `${(n / z.total) * 100}%`;
                const otros = z.total - z.vigentes - z.porVencer - z.criticos;
                return (
                  <li key={z.clave}>
                    <button
                      type="button"
                      onClick={() => seleccionar(z.clave)}
                      aria-pressed={activa}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-card)',
                        border: activa ? '1.5px solid var(--navy-900)' : '1px solid var(--border)',
                        backgroundColor: activa ? 'var(--blue-50)' : '#FFFFFF',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                        display: 'grid',
                        gap: '6px',
                      }}
                    >
                      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: 'var(--navy-900)' }}>
                          <MapPinIcon size={14} />
                          {z.nombre}
                        </span>
                        <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                          {z.total} {z.total === 1 ? 'equipo' : 'equipos'}
                        </span>
                      </span>
                      <span aria-hidden="true" style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                        <span style={{ width: w(z.vigentes), backgroundColor: '#047857' }} />
                        <span style={{ width: w(z.porVencer), backgroundColor: '#B45309' }} />
                        <span style={{ width: w(z.criticos), backgroundColor: '#B91C1C' }} />
                        <span style={{ width: w(Math.max(0, otros)), backgroundColor: '#94A3B8' }} />
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {z.vigentes} vigentes · {z.porVencer} por vencer · {z.criticos} vencidos o no aptos
                        {z.clave === 'sin-ubicacion' ? ' · no se puede ubicar en el mapa' : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Límites departamentales: DANE, Marco Geoestadístico Nacional 2018 (simplificados). Los equipos se ubican por el departamento del propietario.
      </p>
    </div>
  );
};
