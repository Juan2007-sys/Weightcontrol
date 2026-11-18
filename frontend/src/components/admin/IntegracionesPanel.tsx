import React, { useState, useEffect, useCallback } from 'react';
import { integracionesService } from '../../services/integraciones.service';
import type { ConexionExternaItem, SyncLogItem } from '../../services/integraciones.service';
import { toast } from 'sonner';

export const IntegracionesPanel: React.FC = () => {
  const [conexiones, setConexiones] = useState<ConexionExternaItem[]>([]);
  const [historial, setHistorial] = useState<SyncLogItem[]>([]);
  const [nombre, setNombre] = useState('');
  const [codigoSistema, setCodigoSistema] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([
        integracionesService.getConexiones(),
        integracionesService.getHistorial(),
      ]);
      setConexiones(Array.isArray(c) ? c : []);
      setHistorial(Array.isArray(h) ? h : []);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar integraciones externas.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !codigoSistema.trim() || !endpointUrl.trim()) {
      toast.error('Complete nombre, código y URL del sistema externo.');
      return;
    }
    setSaving(true);
    try {
      const res = await integracionesService.crearConexion({
        nombre: nombre.trim(),
        codigoSistema: codigoSistema.trim().toUpperCase(),
        endpointUrl: endpointUrl.trim(),
      });
      setNewApiKey(res.apiKey);
      setNombre('');
      setCodigoSistema('');
      setEndpointUrl('');
      toast.success(`Conexión ${res.codigoSistema} creada.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo crear la conexión externa.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (conn: ConexionExternaItem) => {
    try {
      await integracionesService.cambiarEstado(conn._id, !conn.activo);
      toast.success(`Conexión ${conn.codigoSistema} ${!conn.activo ? 'activada' : 'inactivada'}.`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar el estado.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="gov-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>
          Nueva Conexión con Sistema Externo (HU-16)
        </h3>
        <form
          onSubmit={handleCrear}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Nombre del sistema
            </label>
            <input
              type="text"
              className="gov-input"
              placeholder="Ej. ERP Metrología"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Código único
            </label>
            <input
              type="text"
              className="gov-input"
              placeholder="Ej. ERP_EXT"
              value={codigoSistema}
              onChange={(e) => setCodigoSistema(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Endpoint URL
            </label>
            <input
              type="url"
              className="gov-input"
              placeholder="https://erp.ejemplo.co/webhook"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-gov-primary" disabled={saving} style={{ height: '38px' }}>
            {saving ? 'Guardando...' : 'Registrar Conexión'}
          </button>
        </form>

        {newApiKey && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <strong>API Key generada (guárdela ahora, no se volverá a mostrar):</strong>{' '}
            <code>{newApiKey}</code>
          </div>
        )}
      </div>

      <div className="gov-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>
          Conexiones Autorizadas ({conexiones.length})
        </h3>
        <table className="gov-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Endpoint</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {conexiones.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748B' }}>
                  No hay conexiones externas registradas.
                </td>
              </tr>
            ) : (
              conexiones.map((c) => (
                <tr key={c._id}>
                  <td><strong>{c.codigoSistema}</strong></td>
                  <td>{c.nombre}</td>
                  <td style={{ fontSize: '12px' }}>{c.endpointUrl}</td>
                  <td>{c.activo ? 'Activa' : 'Inactiva'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-gov-compact"
                      onClick={() => handleToggle(c)}
                    >
                      {c.activo ? 'Inactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="gov-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>
          Historial de Sincronizaciones ({historial.length})
        </h3>
        <table className="gov-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Sistema</th>
              <th>Dirección</th>
              <th>Endpoint</th>
              <th>Estado</th>
              <th>HTTP</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>
                  Sin sincronizaciones registradas.
                </td>
              </tr>
            ) : (
              historial.map((h) => (
                <tr key={h._id}>
                  <td style={{ fontSize: '12px' }}>{new Date(h.createdAt).toLocaleString()}</td>
                  <td><strong>{h.sistemaCodigo}</strong></td>
                  <td>{h.direccion}</td>
                  <td style={{ fontSize: '12px' }}>{h.endpoint}</td>
                  <td>{h.estado}</td>
                  <td>{h.codigoHttp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
