import React, { useState } from 'react';
import { toast } from 'sonner';
import { DialogShell } from '../common/DialogShell';
import { instrumentosService } from '../../services/instrumentos.service';
import type { BackendInstrumento } from '../../services/mappers';

interface Props {
  item: BackendInstrumento;
  onClose: () => void;
  onSaved: () => void;
}

const TIPOS = ['Bascula', 'Pesa', 'Dinamometro'];
const CLASES = ['Clase I', 'Clase II', 'Clase III', 'Clase IIII'];
const UNIDADES = ['g', 'kg', 't', 'lb', 'N', 'kN'];

const soloFecha = (v?: string | Date) => (v ? new Date(v).toISOString().slice(0, 10) : '');

const label: React.CSSProperties = { display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 600 };
const input: React.CSSProperties = {
  padding: '7px 9px',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-input)',
  fontSize: '13px',
  fontWeight: 400,
};

/** HU-07: edicion de un equipo existente. El serial es el identificador y queda bloqueado. */
export const EditInstrumentModal: React.FC<Props> = ({ item, onClose, onSaved }) => {
  const [form, setForm] = useState({
    marca: item.marca ?? '',
    modelo: item.modelo ?? '',
    tipo: item.tipo ?? 'Bascula',
    categoriaExactitud: item.categoriaExactitud ?? 'Clase III',
    capacidadMaxima: String(item.capacidadMaxima ?? ''),
    capacidadMinima: String(item.capacidadMinima ?? 0),
    unidadMedida: item.unidadMedida ?? 'kg',
    divisionEscala: String(item.divisionEscala ?? ''),
    codigoPrecintoSIMEL: item.codigoPrecintoSIMEL ?? '',
    ubicacionFisica: item.ubicacionFisica ?? '',
    fechaUltimaCalibracion: soloFecha(item.fechaUltimaCalibracion),
    fechaProximaCalibracion: soloFecha(item.fechaProximaCalibracion),
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: string[] = [];
    const max = Number(form.capacidadMaxima);
    const min = Number(form.capacidadMinima);
    const div = Number(form.divisionEscala);
    if (!form.marca.trim()) local.push('La marca es obligatoria.');
    if (!form.modelo.trim()) local.push('El modelo es obligatorio.');
    if (!(max > 0)) local.push('La capacidad máxima debe ser mayor a 0.');
    if (!(min >= 0) || min >= max) local.push('La capacidad mínima debe ser ≥ 0 y menor que la máxima.');
    if (!(div > 0)) local.push('La división de escala debe ser mayor a 0.');
    if (form.fechaProximaCalibracion && form.fechaUltimaCalibracion && form.fechaProximaCalibracion <= form.fechaUltimaCalibracion) {
      local.push('La próxima calibración debe ser posterior a la última.');
    }
    if (local.length) {
      setErrors(local);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await instrumentosService.patch(item.id || item._id || '', {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        tipo: form.tipo,
        categoriaExactitud: form.categoriaExactitud,
        capacidadMaxima: max,
        capacidadMinima: min,
        unidadMedida: form.unidadMedida,
        divisionEscala: div,
        codigoPrecintoSIMEL: form.codigoPrecintoSIMEL.trim(),
        ubicacionFisica: form.ubicacionFisica.trim(),
        fechaUltimaCalibracion: form.fechaUltimaCalibracion,
        fechaProximaCalibracion: form.fechaProximaCalibracion,
      });
      toast.success(`Instrumento ${item.serial} actualizado. El cambio quedó registrado en el historial.`);
      onSaved();
    } catch (err: any) {
      const data = err?.data;
      const campos: string[] | undefined = Array.isArray(data?.fieldErrors)
        ? data.fieldErrors.map((f: { mensaje: string }) => f.mensaje)
        : undefined;
      const msg = err?.status === 403 ? 'No tiene permisos para modificar equipos.' : err?.message;
      setErrors(campos?.length ? campos : [Array.isArray(msg) ? msg.join(', ') : msg || 'No fue posible guardar.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      title="Editar equipo"
      subtitle={`Serial ${item.serial} (identificador, no editable)`}
      onClose={onClose}
      maxWidth={760}
      footer={
        <>
          <button type="button" className="btn-gov-compact" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-editar-equipo" className="btn-gov-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <form id="form-editar-equipo" onSubmit={submit} noValidate>
        {errors.length > 0 && (
          <div role="alert" className="status-pill danger" style={{ display: 'block', marginBottom: '12px' }}>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          <label style={label}>
            Número de serie
            <input style={{ ...input, backgroundColor: '#F1F5F9' }} value={item.serial} readOnly aria-readonly="true" />
          </label>
          <label style={label}>
            Marca
            <input style={input} value={form.marca} onChange={set('marca')} />
          </label>
          <label style={label}>
            Modelo
            <input style={input} value={form.modelo} onChange={set('modelo')} />
          </label>
          <label style={label}>
            Tipo de equipo
            <select style={input} value={form.tipo} onChange={set('tipo')}>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Clase de exactitud
            <select style={input} value={form.categoriaExactitud} onChange={set('categoriaExactitud')}>
              {CLASES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Unidad de medida
            <select style={input} value={form.unidadMedida} onChange={set('unidadMedida')}>
              {UNIDADES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Capacidad mínima
            <input style={input} type="number" step="any" value={form.capacidadMinima} onChange={set('capacidadMinima')} />
          </label>
          <label style={label}>
            Capacidad máxima
            <input style={input} type="number" step="any" value={form.capacidadMaxima} onChange={set('capacidadMaxima')} />
          </label>
          <label style={label}>
            División de escala (e)
            <input style={input} type="number" step="any" value={form.divisionEscala} onChange={set('divisionEscala')} />
          </label>
          <label style={label}>
            Precinto SIMEL
            <input style={input} value={form.codigoPrecintoSIMEL} onChange={set('codigoPrecintoSIMEL')} />
          </label>
          <label style={label}>
            Ubicación física
            <input style={input} value={form.ubicacionFisica} onChange={set('ubicacionFisica')} />
          </label>
          <label style={label}>
            Última calibración
            <input style={input} type="date" value={form.fechaUltimaCalibracion} onChange={set('fechaUltimaCalibracion')} />
          </label>
          <label style={label}>
            Próxima calibración
            <input style={input} type="date" value={form.fechaProximaCalibracion} onChange={set('fechaProximaCalibracion')} />
          </label>
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Los datos se validan de nuevo (NTC 2031) al guardar. Se registrará el usuario y la fecha/hora de la modificación.
        </p>
      </form>
    </DialogShell>
  );
};
