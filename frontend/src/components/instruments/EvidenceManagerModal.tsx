import React, { useCallback, useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { DialogShell } from '../common/DialogShell';
import { instrumentosService } from '../../services/instrumentos.service';
import type { EvidenciaItem, TipoEvidencia } from '../../services/instrumentos.service';
import { formatDateTime } from '../../utils/dates';

interface Props {
  instrumentId: string;
  serial: string;
  /** Solo Administrador/Tecnico pueden reemplazar fotografias. */
  canEdit: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

/** HU-09: consulta y administracion de las evidencias fotograficas de un equipo. */
export const EvidenceManagerModal: React.FC<Props> = ({ instrumentId, serial, canEdit, onClose, onChanged }) => {
  const [items, setItems] = useState<EvidenciaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<TipoEvidencia | null>(null);
  const [preview, setPreview] = useState<EvidenciaItem | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await instrumentosService.getEvidencias(instrumentId);
      setItems(r.evidencias);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No fue posible cargar las evidencias.');
    }
  }, [instrumentId]);

  useEffect(() => {
    load();
  }, [load]);

  const replace = async (tipo: TipoEvidencia, file?: File) => {
    if (!file) return;
    setBusy(tipo);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.35, maxWidthOrHeight: 1280, useWebWorker: true });
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(compressed);
      });
      const r = await instrumentosService.reemplazarEvidencia(instrumentId, tipo, dataUrl);
      setItems(r.evidencias);
      toast.success('Evidencia fotográfica actualizada.');
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'No fue posible actualizar la evidencia.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DialogShell title="Evidencias fotográficas" subtitle={`Serial ${serial}`} onClose={onClose} maxWidth={900}>
      {error && (
        <div role="alert" className="status-pill danger">
          {error}
        </div>
      )}
      {!items && !error && <p>Cargando evidencias…</p>}
      {items && items.length === 0 && <p>Este equipo no tiene fotografías asociadas.</p>}
      {items && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {items.map((ev) => (
            <figure
              key={ev.tipo}
              data-testid={`evidencia-${ev.tipo}`}
              style={{ margin: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}
            >
              <button
                type="button"
                onClick={() => setPreview(ev)}
                aria-label={`Ver fotografía de ${ev.etiqueta.toLowerCase()} en tamaño completo`}
                style={{ display: 'block', width: '100%', padding: 0, border: 'none', cursor: 'zoom-in', background: '#0B1F3F' }}
              >
                <img
                  src={ev.url}
                  alt={`Fotografía de ${ev.etiqueta.toLowerCase()} del equipo ${serial}`}
                  style={{ width: '100%', height: '170px', objectFit: 'cover', display: 'block' }}
                />
              </button>
              <figcaption style={{ padding: '10px 12px', fontSize: '12px', display: 'grid', gap: '2px' }}>
                <span className="status-pill ok" style={{ justifySelf: 'start' }}>{ev.etiqueta}</span>
                <span>Cargada: <strong>{formatDateTime(ev.fechaCarga)}</strong></span>
                <span>Por: <strong>{ev.cargadoPor?.nombre ?? ev.cargadoPor?.email ?? 'No registrado'}</strong></span>
                {canEdit && (
                  <label className="btn-gov-compact" style={{ marginTop: '6px', cursor: 'pointer', justifySelf: 'start' }}>
                    {busy === ev.tipo ? 'Subiendo…' : 'Reemplazar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={busy !== null}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        replace(ev.tipo, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {preview && (
        <DialogShell title={`Fotografía de ${preview.etiqueta.toLowerCase()}`} subtitle={`Serial ${serial}`} onClose={() => setPreview(null)} maxWidth={1000}>
          <img src={preview.url} alt={`Fotografía de ${preview.etiqueta.toLowerCase()} ampliada`} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </DialogShell>
      )}
    </DialogShell>
  );
};
