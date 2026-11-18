import React, { useState, useEffect, useCallback } from 'react';
import { indicadoresService } from '../../services/indicadores.service';
import type { PanelIndicadoresData } from '../../services/indicadores.service';
import { toast } from 'sonner';

export const IndicadoresPanel: React.FC = () => {
  const [data, setData] = useState<PanelIndicadoresData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoEquipo, setTipoEquipo] = useState('');

  const fetchIndicadores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await indicadoresService.getPanel({
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        tipoEquipo: tipoEquipo || undefined,
      });
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudieron cargar los indicadores metrológicos.');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, tipoEquipo]);

  useEffect(() => {
    fetchIndicadores();
  }, [fetchIndicadores]);

  const maxEstado = Math.max(
    1,
    data?.equipos.porEstado.Vigente ?? 0,
    data?.equipos.porEstado['Por vencer'] ?? 0,
    data?.equipos.porEstado.Vencido ?? 0,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filtros (HU-15) */}
      <div className="gov-card" style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Fecha inicio
            </label>
            <input
              type="date"
              className="gov-input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Fecha fin
            </label>
            <input
              type="date"
              className="gov-input"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Tipo de equipo
            </label>
            <select
              className="gov-input"
              value={tipoEquipo}
              onChange={(e) => setTipoEquipo(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="BASCULA_COMERCIAL">Báscula Comercial</option>
              <option value="BASCULA_CAMIONERA">Báscula Camionera</option>
              <option value="BALANZA_ANALITICA">Balanza Analítica</option>
              <option value="PESA_PATRON">Pesa Patrón</option>
              <option value="DINAMOMETRO">Dinamómetro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-gov-primary"
              onClick={fetchIndicadores}
              disabled={loading}
              style={{ height: '38px' }}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button
              type="button"
              className="btn-gov-compact"
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
                setTipoEquipo('');
              }}
              style={{ height: '38px' }}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Tarjetas KPI */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
            }}
          >
            <div className="gov-card" style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>Equipos registrados</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
                {data.equipos.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Activos: {data.equipos.activos} · Inactivos: {data.equipos.inactivos}
              </div>
            </div>

            <div className="gov-card" style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>Calibraciones realizadas</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0369A1' }}>
                {data.calibraciones.realizadas}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Pendientes: {data.calibraciones.pendientes} · Vencidas: {data.calibraciones.vencidas}
              </div>
            </div>

            <div className="gov-card" style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>Certificados emitidos</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#047857' }}>
                {data.certificados.emitidos}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Vigentes: {data.certificados.vigentes} · Anulados: {data.certificados.anulados}
              </div>
            </div>
          </div>

          {/* Gráfico de barras por estado */}
          <div className="gov-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>
              Distribución de equipos por estado de calibración
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Vigente', value: data.equipos.porEstado.Vigente, color: '#10B981' },
                { label: 'Por vencer', value: data.equipos.porEstado['Por vencer'], color: '#F59E0B' },
                { label: 'Vencido', value: data.equipos.porEstado.Vencido, color: '#EF4444' },
              ].map((bar) => (
                <div key={bar.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{bar.label}</span>
                    <span>{bar.value}</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', backgroundColor: '#E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.round((bar.value / maxEstado) * 100)}%`,
                        height: '100%',
                        backgroundColor: bar.color,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
