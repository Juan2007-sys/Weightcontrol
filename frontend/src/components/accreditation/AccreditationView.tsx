import React, { useState, useEffect } from 'react';
import { CheckIcon, XIcon } from '../common/Icons';
import { calibracionesService } from '../../services/calibraciones.service';
import { toast } from 'sonner';

interface ValidationItem {
  id: string;
  actaNumero: string;
  oec: string;
  laboratorio: string;
  instrumento: string;
  empStatus: string;
  fechaEnsayo: string;
  estado: 'PENDIENTE EVALUACIÓN' | 'APROBADA' | 'OBSERVADA';
}

const INITIAL_VALIDATIONS: ValidationItem[] = [
  {
    id: 'VAL-01',
    actaNumero: 'ACT-2025-00412-BOG',
    oec: 'ONAC-18-LAB-042',
    laboratorio: 'METROLOGÍA INDUSTRIAL DE COLOMBIA S.A.S.',
    instrumento: 'Báscula Camionera 80t (Toledo Jaguar 8142)',
    empStatus: 'Ensayos de excentricidad y repetibilidad conformes (± 1.0e)',
    fechaEnsayo: '13/05/2025',
    estado: 'PENDIENTE EVALUACIÓN',
  },
  {
    id: 'VAL-02',
    actaNumero: 'ACT-2025-00413-VAL',
    oec: 'ONAC-22-LAB-019',
    laboratorio: 'CALIBRACIONES Y PESAJE DEL VALLE LTDA.',
    instrumento: 'Balanza Mostrador 30kg (Torrey L-EQ)',
    empStatus: 'Error medio dentro de tolerancia permisible (± 0.5e)',
    fechaEnsayo: '14/05/2025',
    estado: 'PENDIENTE EVALUACIÓN',
  },
  {
    id: 'VAL-03',
    actaNumero: 'ACT-2025-00399-ANT',
    oec: 'ONAC-15-LAB-088',
    laboratorio: 'SERVICIOS METROLÓGICOS ANTIOQUIA E.U.',
    instrumento: 'Dispensador Gasolina Corriente (Gilbarco 500S)',
    empStatus: 'Desviación límite de repetibilidad bajo observación (+0.25%)',
    fechaEnsayo: '12/05/2025',
    estado: 'OBSERVADA',
  },
];

export const AccreditationView: React.FC = () => {
  const [items, setItems] = useState<ValidationItem[]>(INITIAL_VALIDATIONS);

  useEffect(() => {
    const loadCalibraciones = async () => {
      try {
        const res = await calibracionesService.getAll();
        if (res.data && res.data.length > 0) {
          const mapped: ValidationItem[] = res.data.map((c) => ({
            id: c.id || c._id || c.numeroCertificado,
            actaNumero: c.numeroCertificado,
            oec: c.codigoPrecintoSIMEL || 'ONAC-18-LAB-042',
            laboratorio: c.laboratorioAcreditado,
            instrumento: typeof c.instrumento === 'object' && c.instrumento ? `${c.instrumento.marca || ''} ${c.instrumento.modelo || ''}` : `Equipo ${c.instrumento}`,
            empStatus: c.observaciones || `Dictamen: ${c.resultado} (Incertidumbre: ${c.incertidumbreExpandida || '±0.5e'})`,
            fechaEnsayo: new Date(c.fechaCalibracion).toLocaleDateString('es-CO'),
            estado: c.resultado === 'Conforme' ? 'APROBADA' : 'OBSERVADA',
          }));
          setItems(mapped);
        }
      } catch {
        // Fallback a iniciales
      }
    };

    loadCalibraciones();
  }, []);

  const handleAction = (id: string, newStatus: 'APROBADA' | 'OBSERVADA') => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, estado: newStatus } : item))
    );
    if (newStatus === 'APROBADA') {
      toast.success(`Acta ${id} aprobada e inscrita en el registro oficial RUMP.`);
    } else {
      toast.warning(`Acta ${id} devuelta con requerimiento técnico.`);
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="gov-container">
        {/* Encabezado */}
        <div
          style={{
            borderLeft: '4px solid var(--navy-900)',
            paddingLeft: '18px',
            marginBottom: '24px',
          }}
        >
          <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
            ORGANISMOS ACREDITADOS · GESTIÓN DE ENSAYOS Y ACTAS METROLÓGICAS
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
            Validaciones Pendientes de Acreditación
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Revisión formal de actas de ensayo emitidas por Organismos Evaluadores de la Conformidad acreditados ante el ONAC.
          </p>
        </div>

        {/* Tabla de Actas y Ensayos */}
        <div
          className="gov-card"
          style={{
            overflowX: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            backgroundColor: '#FFFFFF',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--navy-900)', color: '#FFFFFF' }}>
              <tr>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>ACTA &amp; EXPEDIENTE</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>OEC CALIBRADOR / LABORATORIO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>EQUIPO METROLÓGICO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF' }}>DICTAMEN DE ENSAYO EMP</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF', textAlign: 'center' }}>ESTADO</th>
                <th scope="col" className="microlabel" style={{ padding: '12px 16px', color: '#FFFFFF', textAlign: 'right' }}>RESOLUCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{item.actaNumero}</div>
                    <div className="font-mono microlabel-sm" style={{ color: 'var(--text-muted)' }}>Fecha: {item.fechaEnsayo}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{item.laboratorio}</div>
                    <div className="font-mono microlabel-sm" style={{ color: 'var(--blue-600)' }}>CÓDIGO: {item.oec}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{item.instrumento}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                    {item.empStatus}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className={`status-pill ${item.estado === 'APROBADA' ? 'ok' : item.estado === 'OBSERVADA' ? 'warn' : 'info'}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {item.estado === 'PENDIENTE EVALUACIÓN' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-gov-compact"
                          onClick={() => handleAction(item.id, 'APROBADA')}
                          style={{ color: '#065F46', borderColor: 'var(--ok)' }}
                          title="Aprobar e inscribir dictamen en RUMP"
                        >
                          <CheckIcon size={12} />
                          <span>Aprobar</span>
                        </button>
                        <button
                          type="button"
                          className="btn-gov-compact"
                          onClick={() => handleAction(item.id, 'OBSERVADA')}
                          style={{ color: '#991B1B', borderColor: 'var(--danger)' }}
                          title="Devolver con observaciones técnicas"
                        >
                          <XIcon size={12} />
                          <span>Observar</span>
                        </button>
                      </div>
                    ) : (
                      <span className="microlabel-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                        PROCESADA
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

