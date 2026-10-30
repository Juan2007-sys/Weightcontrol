import React, { useState } from 'react';
import { toast } from 'sonner';
import { DialogShell } from '../common/DialogShell';
import { instrumentosService } from '../../services/instrumentos.service';

interface Props {
  id: string;
  serial: string;
  /** Estado actual del equipo; la accion es la contraria. */
  activo: boolean;
  onClose: () => void;
  onDone: () => void;
}

/** HU-08: inactivar o reactivar un equipo (solo Administrador). No elimina informacion historica. */
export const ToggleActiveModal: React.FC<Props> = ({ id, serial, activo, onClose, onDone }) => {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inactivar = activo;

  const confirm = async () => {
    if (inactivar && motivo.trim().length < 5) {
      setError('Indique el motivo de la inactivación (mínimo 5 caracteres).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await instrumentosService.setActivo(id, !activo, inactivar ? motivo.trim() : undefined);
      toast.success(`Equipo ${serial} ${inactivar ? 'inactivado' : 'reactivado'}. Su historial se conserva.`);
      onDone();
    } catch (e: any) {
      setError(e?.status === 403 ? 'Solo el Administrador puede cambiar el estado del equipo.' : e?.message || 'No fue posible cambiar el estado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      title={inactivar ? 'Inactivar equipo' : 'Reactivar equipo'}
      subtitle={`Serial ${serial}`}
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          <button type="button" className="btn-gov-compact" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-gov-primary" onClick={confirm} disabled={saving}>
            {saving ? 'Procesando…' : inactivar ? 'Inactivar equipo' : 'Reactivar equipo'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '13px', marginBottom: '12px' }}>
        {inactivar
          ? 'Un equipo inactivo no podrá utilizarse en nuevas calibraciones. Su información histórica se mantiene disponible y la acción queda registrada con su usuario.'
          : 'El equipo volverá a estar disponible para nuevas calibraciones.'}
      </p>
      {inactivar && (
        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
          Motivo de la inactivación
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            style={{ padding: '8px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-input)', fontSize: '13px', fontWeight: 400 }}
          />
        </label>
      )}
      {error && (
        <div role="alert" className="status-pill danger" style={{ display: 'block', marginTop: '10px' }}>
          {error}
        </div>
      )}
    </DialogShell>
  );
};
