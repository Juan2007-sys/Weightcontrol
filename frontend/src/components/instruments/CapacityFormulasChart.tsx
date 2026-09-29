import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface CapacityFormulasChartProps {
  capacidadMin: number;
  capacidadMax: number;
  unidadMedida: string;
  divisionEscala?: number;
}

export const CapacityFormulasChart: React.FC<CapacityFormulasChartProps> = ({
  capacidadMin,
  capacidadMax,
  unidadMedida,
  divisionEscala = 1,
}) => {
  const isConsistent = capacidadMax > 0 && capacidadMin < capacidadMax && capacidadMin >= 0;

  // 1. Rango de capacidad: R = C_max - C_min
  const rango = useMemo(() => {
    if (!isConsistent) return 0;
    return Number((capacidadMax - capacidadMin).toFixed(4));
  }, [capacidadMax, capacidadMin, isConsistent]);

  // 2. Promedio de capacidad: C_prom = (C_max + C_min) / 2
  const promedio = useMemo(() => {
    if (!isConsistent) return 0;
    return Number(((capacidadMax + capacidadMin) / 2).toFixed(4));
  }, [capacidadMax, capacidadMin, isConsistent]);

  // 3. Porcentaje de diferencia respecto a la máxima: P = ((C_max - C_min) / C_max) * 100
  const porcentajeDiferencia = useMemo(() => {
    if (!isConsistent || capacidadMax <= 0) return 0;
    const p = ((capacidadMax - capacidadMin) / capacidadMax) * 100;
    return Number(p.toFixed(2));
  }, [capacidadMax, capacidadMin, isConsistent]);

  // Posiciones porcentuales para renderizado SVG (escala 0 a capacidadMax)
  const minPercent = isConsistent && capacidadMax > 0 ? (capacidadMin / capacidadMax) * 100 : 0;
  const promPercent = isConsistent && capacidadMax > 0 ? (promedio / capacidadMax) * 100 : 50;

  return (
    <div
      style={{
        marginTop: '16px',
        marginBottom: '16px',
        backgroundColor: '#F8FAFC',
        border: isConsistent ? '1px solid #CBD5E1' : '1px solid #FCA5A5',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
      }}
    >
      {/* Encabezado del Análisis Metrológico */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div className="microlabel" style={{ color: 'var(--blue-600)', letterSpacing: '0.05em' }}>
            ANÁLISIS MATEMÁTICO METROLÓGICO · INTERVALO OPERATIVO Y FÓRMULAS NTC 2031
          </div>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)' }}>
            Gráfica de Capacidad y Variación Relativa
          </h4>
        </div>

        <span
          className={`status-pill ${isConsistent ? 'ok' : 'danger'}`}
          style={{ fontSize: '11px', fontWeight: 700 }}
        >
          {isConsistent ? 'FÓRMULAS VÁLIDAS' : 'INCONSISTENCIA MIN >= MAX'}
        </span>
      </div>

      {/* Gráfica SVG Dinámica del Intervalo de Capacidad */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '16px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
          <span>0 {unidadMedida} (Tara Cero)</span>
          <span style={{ color: '#0369A1', fontWeight: 700 }}>
            Zona Útil de Pesaje [{capacidadMin} — {capacidadMax} {unidadMedida}]
          </span>
          <span>{capacidadMax} {unidadMedida} (Max)</span>
        </div>

        <svg width="100%" height="86" viewBox="0 0 600 86" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="capacityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0284C7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0B1F3F" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="deadZoneGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
          </defs>

          {/* Eje base horizontal completo (0 a Max) */}
          <rect x="20" y="24" width="560" height="12" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />

          {/* Zona muerta inferior (0 a C_min) */}
          {minPercent > 0 && isConsistent && (
            <rect
              x="20"
              y="24"
              width={Math.max(0, (minPercent / 100) * 560)}
              height="12"
              fill="url(#deadZoneGradient)"
              rx="6"
            />
          )}

          {/* Zona Operativa de Medición (C_min a C_max) */}
          {isConsistent && (
            <motion.rect
              initial={{ width: 0 }}
              animate={{ width: Math.max(8, ((100 - minPercent) / 100) * 560) }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              x={20 + (minPercent / 100) * 560}
              y="23"
              height="14"
              rx="7"
              fill="url(#capacityGradient)"
            />
          )}

          {/* Marcador C_min */}
          {isConsistent && (
            <g transform={`translate(${20 + (minPercent / 100) * 560}, 0)`}>
              <line x1="0" y1="14" x2="0" y2="44" stroke="#D97706" strokeWidth="2" strokeDasharray="3,2" />
              <circle cx="0" cy="30" r="5" fill="#D97706" stroke="#FFFFFF" strokeWidth="2" />
              <text x="0" y="10" textAnchor="middle" fontSize="10" fontWeight="700" fill="#B45309">
                C_min: {capacidadMin}
              </text>
            </g>
          )}

          {/* Marcador C_prom (Punto Medio) */}
          {isConsistent && (
            <g transform={`translate(${20 + (promPercent / 100) * 560}, 0)`}>
              <line x1="0" y1="18" x2="0" y2="46" stroke="#059669" strokeWidth="2" />
              <polygon points="0,22 -5,30 5,30" fill="#059669" />
              <text x="0" y="60" textAnchor="middle" fontSize="10" fontWeight="700" fill="#047857">
                C_prom: {promedio} {unidadMedida}
              </text>
            </g>
          )}

          {/* Marcador C_max */}
          {isConsistent && (
            <g transform={`translate(580, 0)`}>
              <line x1="0" y1="14" x2="0" y2="44" stroke="#0B1F3F" strokeWidth="2" />
              <circle cx="0" cy="30" r="5" fill="#0B1F3F" stroke="#FFFFFF" strokeWidth="2" />
              <text x="0" y="10" textAnchor="end" fontSize="10" fontWeight="800" fill="#0B1F3F">
                C_max: {capacidadMax} {unidadMedida}
              </text>
            </g>
          )}

          {/* Si es inconsistente, alerta en el SVG */}
          {!isConsistent && (
            <text x="300" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#DC2626">
              ⚠️ Inconsistencia: Capacidad Mínima ({capacidadMin}) &gt;= Capacidad Máxima ({capacidadMax})
            </text>
          )}
        </svg>

        {/* Indicador de cobertura operativa porcentual */}
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Escalón de verificación: <strong>e = {divisionEscala} g</strong>
          </span>
          <span style={{ fontWeight: 700, color: '#0369A1' }}>
            Amplitud del rango dinámico: <strong>{porcentajeDiferencia}% de C_max</strong>
          </span>
        </div>
      </div>

      {/* Grid de las 3 Fórmulas Matemáticas Requeridas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Fórmula 1: Rango de capacidad */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #0284C7',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div className="microlabel" style={{ color: '#0284C7', marginBottom: '4px' }}>
            1. RANGO DE CAPACIDAD
          </div>
          <div className="font-mono" style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
            R = C_max - C_min
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy-900)' }} className="font-mono">
            {rango} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>{unidadMedida}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
            {capacidadMax} - {capacidadMin} = {rango} {unidadMedida}
          </div>
        </div>

        {/* Fórmula 2: Promedio de capacidad */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #059669',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div className="microlabel" style={{ color: '#059669', marginBottom: '4px' }}>
            2. PROMEDIO DE CAPACIDAD
          </div>
          <div className="font-mono" style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
            C_prom = (C_max + C_min) / 2
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy-900)' }} className="font-mono">
            {promedio} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>{unidadMedida}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
            ({capacidadMax} + {capacidadMin}) / 2 = {promedio} {unidadMedida}
          </div>
        </div>

        {/* Fórmula 3: Porcentaje de diferencia respecto a la máxima */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #7C3AED',
            borderRadius: '6px',
            padding: '12px',
          }}
        >
          <div className="microlabel" style={{ color: '#7C3AED', marginBottom: '4px' }}>
            3. % DIFERENCIA RESPECTO A MÁXIMA
          </div>
          <div className="font-mono" style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
            P = ((C_max - C_min) / C_max) * 100
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--navy-900)' }} className="font-mono">
            {porcentajeDiferencia} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
            (({rango}) / {capacidadMax}) * 100 = {porcentajeDiferencia}%
          </div>
        </div>
      </div>
    </div>
  );
};
