import React, { useEffect, useState } from 'react';
import { DialogShell } from '../common/DialogShell';
import { instrumentosService } from '../../services/instrumentos.service';
import type { HistorialInstrumento } from '../../services/instrumentos.service';
import { formatCalendarDate, formatDateTime } from '../../utils/dates';

interface Props {
  instrumentId: string;
  serial: string;
  onClose: () => void;
}

const OPERACION: Record<string, string> = {
  CREATE: 'Registro',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  CALIBRATE: 'Calibración',
  GENERATE_CERT: 'Certificado emitido',
  STATUS_CHANGE: 'Cambio de estado',
  INSPECTION: 'Inspección',
  ANNUL: 'Anulación',
  VERIFICATION_FAILURE: 'Verificación fallida',
};

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.04em' };
const td: React.CSSProperties = { padding: '8px 10px', verticalAlign: 'top', fontSize: '12.5px' };

export const EquipmentHistoryModal: React.FC<Props> = ({ instrumentId, serial, onClose }) => {
  const [data, setData] = useState<HistorialInstrumento | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    instrumentosService
      .getHistorial(instrumentId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || 'No fue posible cargar el historial.'));
    return () => {
      cancelled = true;
    };
  }, [instrumentId]);

  return (
    <DialogShell title="Historial del equipo" subtitle={`Serial ${serial}`} onClose={onClose} maxWidth={980}>
      {error && (
        <div role="alert" className="status-pill danger">
          {error}
        </div>
      )}
      {!data && !error && <p data-testid="historial-cargando">Cargando historial…</p>}
      {data && (
        <div style={{ display: 'grid', gap: '22px' }} data-testid="historial-contenido">
          <section aria-labelledby="hist-eventos">
            <h3 id="hist-eventos" className="microlabel" style={{ marginBottom: '8px' }}>
              EVENTOS Y CAMBIOS ({data.totalEventos})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Registro inmutable de trazabilidad: los eventos no pueden editarse ni eliminarse.
            </p>
            {data.eventos.length === 0 ? (
              <p>No hay eventos registrados para este equipo.</p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: 'var(--navy-900)', color: '#FFF' }}>
                    <tr>
                      <th scope="col" style={th}>FECHA</th>
                      <th scope="col" style={th}>OPERACIÓN</th>
                      <th scope="col" style={th}>USUARIO RESPONSABLE</th>
                      <th scope="col" style={th}>DETALLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.eventos.map((ev, i) => (
                      <tr key={ev.id} style={{ borderTop: '1px solid var(--border)', backgroundColor: i % 2 ? '#F9FAFB' : '#FFF' }} data-testid="historial-evento">
                        <td style={td} className="font-mono">{formatDateTime(ev.fecha)}</td>
                        <td style={td}>
                          <strong>{OPERACION[ev.tipoOperacion] ?? ev.tipoOperacion}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.entidad}</div>
                        </td>
                        <td style={td}>
                          {ev.usuario ? (
                            <>
                              <div>{ev.usuario.nombre ?? ev.usuario.email ?? 'Usuario'}</div>
                              {ev.usuario.rol && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.usuario.rol}</div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Sistema</span>
                          )}
                        </td>
                        <td style={td}>
                          {ev.descripcion}
                          {ev.camposModificados && ev.camposModificados.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Campos modificados: {ev.camposModificados.join(', ')}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="hist-cal">
            <h3 id="hist-cal" className="microlabel" style={{ marginBottom: '8px' }}>
              CALIBRACIONES ASOCIADAS ({data.calibraciones.length})
            </h3>
            {data.calibraciones.length === 0 ? (
              <p>Este equipo aún no tiene calibraciones registradas.</p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: 'var(--navy-900)', color: '#FFF' }}>
                    <tr>
                      <th scope="col" style={th}>CERTIFICADO</th>
                      <th scope="col" style={th}>FECHA</th>
                      <th scope="col" style={th}>PRÓXIMA</th>
                      <th scope="col" style={th}>RESULTADO</th>
                      <th scope="col" style={th}>LABORATORIO / TÉCNICO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.calibraciones.map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }} data-testid="historial-calibracion">
                        <td style={td} className="font-mono">{c.numeroCertificado}</td>
                        <td style={td}>{formatCalendarDate(c.fechaCalibracion)}</td>
                        <td style={td}>{formatCalendarDate(c.fechaProximaCalibracion)}</td>
                        <td style={td}>
                          <span className={`status-pill ${c.anulado ? 'warn' : c.resultado === 'Conforme' ? 'ok' : 'danger'}`}>
                            {c.anulado ? 'Anulado' : c.resultado}
                          </span>
                        </td>
                        <td style={td}>
                          {c.laboratorio ?? '—'}
                          {c.tecnico && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.tecnico}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </DialogShell>
  );
};
