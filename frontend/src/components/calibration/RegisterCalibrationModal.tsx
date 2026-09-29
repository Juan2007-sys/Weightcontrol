import React, { useState } from 'react';
import {
  XIcon,
  ShieldCheckIcon,
  FileTextIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  AlertTriangleIcon,
  DownloadIcon,
  LockIcon,
  EyeIcon,
} from '../common/Icons';
import { QRCodeSVG } from 'qrcode.react';
import type { MetrologicalInstrument } from '../../types/metrology';
import { calibracionesService } from '../../services/calibraciones.service';
import type { CreateCalibracionPayload, PatronCalibracion, PuntoEnsayoEMP } from '../../services/calibraciones.service';
import { PdfCertificateViewerModal } from '../common/PdfCertificateViewerModal';
import { toast } from 'sonner';

interface RegisterCalibrationModalProps {
  instruments: MetrologicalInstrument[];
  preselectedInstrument?: MetrologicalInstrument | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegisterCalibrationModal: React.FC<RegisterCalibrationModalProps> = ({
  instruments,
  preselectedInstrument,
  onClose,
  onSuccess,
}) => {
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>(
    preselectedInstrument?.id || (instruments.length > 0 ? instruments[0].id : '')
  );

  const [numeroCertificado, setNumeroCertificado] = useState<string>(
    `CERT-NTC2031-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [laboratorioAcreditado] = useState<string>(
    'ONAC-18-LAB-042 (Laboratorio Metrológico Nacional)'
  );
  const [fechaCalibracion, setFechaCalibracion] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [fechaProximaCalibracion, setFechaProximaCalibracion] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [resultado, setResultado] = useState<'Conforme' | 'No Conforme'>('Conforme');
  const [codigoPrecintoSIMEL] = useState<string>(
    preselectedInstrument?.precintoSIMEL || `STAMP-CO-${Math.floor(1000000 + Math.random() * 9000000)}`
  );
  const [incertidumbreExpandida] = useState<string>('U = ± 0.002 kg (k=2, 95.45%)');
  const [observaciones] = useState<string>(
    'Ensayos metrológicos ejecutados bajo condiciones ambientales controladas (T: 20°C ± 1°C, HR: 55%). Cumple NTC 2031.'
  );

  // Lista de Patrones Trazables (Mínimo 1 requerido para completitud)
  const [patrones, setPatrones] = useState<PatronCalibracion[]>([
    {
      codigoPatron: 'PAT-MASA-M1-001',
      descripcion: 'Juego de Pesas Clase M1 (1g a 20kg)',
      certificadoTrazabilidad: 'INM-ONAC-2025-9921',
      fechaVencimientoPatron: '2026-12-31',
    },
  ]);

  // Lista de Puntos de Ensayo EMP (Mínimo 1 requerido para completitud)
  const [errores, setErrores] = useState<PuntoEnsayoEMP[]>([
    { cargaNominal: 5, errorEncontrado: 0.001, errorMaximoPermitido: 0.005, cumple: true },
    { cargaNominal: 15, errorEncontrado: 0.003, errorMaximoPermitido: 0.0075, cumple: true },
    { cargaNominal: 30, errorEncontrado: 0.004, errorMaximoPermitido: 0.015, cumple: true },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [issuedCertId, setIssuedCertId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Validaciones de completitud (HU-04)
  const hasPatrones = patrones.length > 0 && patrones.every((p) => p.codigoPatron.trim() && p.certificadoTrazabilidad.trim());
  const hasErrores = errores.length > 0;
  const isCompletenessValid = hasPatrones && hasErrores && selectedInstrumentId && numeroCertificado.trim();

  const handleAddPatron = () => {
    setPatrones((prev) => [
      ...prev,
      {
        codigoPatron: `PAT-MASA-F2-${prev.length + 1}`,
        descripcion: 'Pesa Patrón Clase F2',
        certificadoTrazabilidad: `CERT-TRAZ-2026-0${prev.length + 1}`,
        fechaVencimientoPatron: '2027-06-30',
      },
    ]);
  };

  const handleRemovePatron = (idx: number) => {
    setPatrones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPuntoEnsayo = () => {
    setErrores((prev) => [
      ...prev,
      {
        cargaNominal: 10,
        errorEncontrado: 0.002,
        errorMaximoPermitido: 0.005,
        cumple: true,
      },
    ]);
  };

  const handleRemovePuntoEnsayo = (idx: number) => {
    setErrores((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePuntoEnsayo = (idx: number, field: keyof PuntoEnsayoEMP, value: any) => {
    setErrores((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };
      if (field === 'errorEncontrado' || field === 'errorMaximoPermitido') {
        item.cumple = Math.abs(item.errorEncontrado) <= item.errorMaximoPermitido;
      }
      updated[idx] = item;
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!isCompletenessValid) {
      toast.error('Calibración Incompleta: Debe registrar al menos 1 patrón trazable y 1 punto de ensayo contra el EMP.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateCalibracionPayload = {
        instrumentoId: selectedInstrumentId,
        laboratorioAcreditado: laboratorioAcreditado.trim(),
        numeroCertificado: numeroCertificado.trim().toUpperCase(),
        fechaCalibracion: new Date(fechaCalibracion).toISOString(),
        fechaProximaCalibracion: new Date(fechaProximaCalibracion).toISOString(),
        resultado,
        codigoPrecintoSIMEL: codigoPrecintoSIMEL.trim().toUpperCase(),
        patronesUtilizados: patrones.map((p) => ({
          ...p,
          fechaVencimientoPatron: new Date(p.fechaVencimientoPatron).toISOString(),
        })),
        erroresMaximosPermitidos: errores,
        incertidumbreExpandida,
        observaciones,
      };

      const res = await calibracionesService.create(payload);
      setIssuedCertId(res.id || (res as any)._id || payload.numeroCertificado);
      toast.success(`¡Certificado de calibración ${payload.numeroCertificado} emitido y sellado inmutablemente!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || 'Error al emitir calibración';
      if (status === 409) {
        toast.error(`Conflicto de Duplicidad: Ya existe una calibración con el certificado '${numeroCertificado}'.`);
      } else if (status === 403) {
        toast.error('Acceso Denegado: Su rol no cuenta con permisos para emitir certificados metrológicos.');
      } else {
        toast.error(`Error: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(7, 20, 39, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        className="gov-card"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            backgroundColor: 'var(--navy-900)',
            color: '#FFFFFF',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextIcon size={22} style={{ color: 'var(--blue-50)' }} />
            <div>
              <div className="microlabel" style={{ color: '#94A3B8' }}>
                MÓDULO TÉCNICO OEC · EMISIÓN OFICIAL DE CERTIFICADO DE CALIBRACIÓN
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {issuedCertId ? 'Certificado Emitido e Inmutable' : 'Registrar Ensayos y Emitir Certificado NTC 2031'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {issuedCertId ? (
            /* Vista de Éxito con Descarga de PDF y Sello de Inmutabilidad */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--ok-bg)',
                  border: '2px solid var(--ok)',
                  color: 'var(--ok)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <CheckIcon size={36} />
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--navy-900)' }}>
                Certificado Emitido y Sellado Criptográficamente
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '560px', margin: '8px auto 20px auto' }}>
                El certificado <strong>{numeroCertificado}</strong> ha sido radicado exitosamente en el censo RUMP con dictamen <strong>{resultado.toUpperCase()}</strong>.
              </p>

              {/* Banner de Inmutabilidad (HU-04) */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-pill)',
                  color: '#1E40AF',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '24px',
                }}
              >
                <LockIcon size={14} />
                <span>INMUTABLE: Registro bloqueado contra modificaciones posteriores según ISO/IEC 27001</span>
              </div>

              {/* Código QR Dinámico y Acciones de Certificado */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', flexWrap: 'wrap', margin: '20px 0' }}>
                <div
                  style={{
                    border: '2px solid var(--border-strong)',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <QRCodeSVG
                    value={`https://weightcontrol.gov.co/verificar?cert=${encodeURIComponent(numeroCertificado)}`}
                    size={120}
                    level="M"
                    includeMargin={false}
                  />
                  <span className="font-mono" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--navy-900)', marginTop: '8px' }}>
                    {numeroCertificado}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '240px' }}>
                  <button
                    type="button"
                    className="btn-gov-primary"
                    onClick={() => setIsPdfModalOpen(true)}
                    style={{ padding: '12px 20px', fontSize: '14px', gap: '8px', justifyContent: 'center' }}
                  >
                    <EyeIcon size={18} />
                    <FileTextIcon size={18} />
                    <span>Visualizar Certificado Oficial</span>
                  </button>

                  <button
                    type="button"
                    className="btn-gov-secondary"
                    onClick={() => calibracionesService.triggerPdfDownload(issuedCertId)}
                    style={{ padding: '10px 18px', fontSize: '13px', gap: '8px', justifyContent: 'center' }}
                  >
                    <DownloadIcon size={16} />
                    <span>Descargar Archivo (.PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Formulario de Registro de Calibración */
            <>
              {/* 1. Instrumento y Laboratorio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                <div>
                  <label htmlFor="cal-inst-select" className="microlabel" style={{ display: 'block', color: 'var(--navy-900)', marginBottom: '6px' }}>
                    INSTRUMENTO A CALIBRAR (CENSO RUMP)
                  </label>
                  <select
                    id="cal-inst-select"
                    value={selectedInstrumentId}
                    onChange={(e) => setSelectedInstrumentId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontSize: '13px' }}
                  >
                    {instruments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.serial} — {inst.marca} {inst.modelo} ({inst.establecimiento})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cal-num-cert" className="microlabel" style={{ display: 'block', color: 'var(--navy-900)', marginBottom: '6px' }}>
                    NÚMERO DE CERTIFICADO / FOLIO
                  </label>
                  <input
                    id="cal-num-cert"
                    type="text"
                    className="font-mono"
                    value={numeroCertificado}
                    onChange={(e) => setNumeroCertificado(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* 2. Fechas, Dictamen y Precinto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label htmlFor="cal-date-cal" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    FECHA DE CALIBRACIÓN
                  </label>
                  <input
                    id="cal-date-cal"
                    type="date"
                    value={fechaCalibracion}
                    onChange={(e) => setFechaCalibracion(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                  />
                </div>

                <div>
                  <label htmlFor="cal-date-prox" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    VENCIMIENTO / PRÓXIMA
                  </label>
                  <input
                    id="cal-date-prox"
                    type="date"
                    value={fechaProximaCalibracion}
                    onChange={(e) => setFechaProximaCalibracion(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                  />
                </div>

                <div>
                  <label htmlFor="cal-res" className="microlabel" style={{ display: 'block', color: 'var(--navy-900)', marginBottom: '6px' }}>
                    DICTAMEN METROLÓGICO
                  </label>
                  <select
                    id="cal-res"
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border-strong)',
                      fontWeight: 700,
                      backgroundColor: resultado === 'Conforme' ? '#ECFDF5' : '#FEF2F2',
                      color: resultado === 'Conforme' ? '#065F46' : '#991B1B',
                    }}
                  >
                    <option value="Conforme">CONFORME (APTO)</option>
                    <option value="No Conforme">NO CONFORME (RECHAZADO)</option>
                  </select>
                </div>
              </div>

              {/* 3. Patrones Trazables Requeridos (HU-04) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="microlabel" style={{ color: 'var(--navy-900)', fontWeight: 800 }}>
                    1. PATRONES METROLÓGICOS TRAZABLES UTILIZADOS (MÍNIMO 1 REQUERIDO)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPatron}
                    className="btn-gov-compact"
                    style={{ fontSize: '11px', gap: '4px' }}
                  >
                    <PlusIcon size={12} />
                    <span>Agregar Patrón</span>
                  </button>
                </div>

                {patrones.length === 0 ? (
                  <div style={{ padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '12px', borderRadius: '4px' }}>
                    ⚠️ Debe declarar al menos 1 patrón de calibración trazable para poder emitir el certificado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {patrones.map((pat, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 2fr 1.5fr 40px',
                          gap: '8px',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Código Patrón"
                          value={pat.codigoPatron}
                          onChange={(e) => {
                            const updated = [...patrones];
                            updated[idx].codigoPatron = e.target.value;
                            setPatrones(updated);
                          }}
                          style={{ padding: '6px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '3px' }}
                        />
                        <input
                          type="text"
                          placeholder="Descripción"
                          value={pat.descripcion}
                          onChange={(e) => {
                            const updated = [...patrones];
                            updated[idx].descripcion = e.target.value;
                            setPatrones(updated);
                          }}
                          style={{ padding: '6px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '3px' }}
                        />
                        <input
                          type="text"
                          placeholder="Cert. Trazabilidad"
                          value={pat.certificadoTrazabilidad}
                          onChange={(e) => {
                            const updated = [...patrones];
                            updated[idx].certificadoTrazabilidad = e.target.value;
                            setPatrones(updated);
                          }}
                          style={{ padding: '6px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '3px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePatron(idx)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Ensayos y Evaluación de Error Máximo Permitido (EMP) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="microlabel" style={{ color: 'var(--navy-900)', fontWeight: 800 }}>
                    2. PUNTOS DE ENSAYO DE ERROR CONTRA EL EMP (NTC 2031)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPuntoEnsayo}
                    className="btn-gov-compact"
                    style={{ fontSize: '11px', gap: '4px' }}
                  >
                    <PlusIcon size={12} />
                    <span>Agregar Punto</span>
                  </button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#F1F5F9' }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>CARGA NOMINAL ($L$)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>ERROR MEDIDO ($E$)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>EMP LÍMITE (±)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>DICTAMEN</th>
                        <th style={{ padding: '8px 10px', width: '30px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {errores.map((errItem, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="number"
                              value={errItem.cargaNominal}
                              onChange={(e) => handleUpdatePuntoEnsayo(idx, 'cargaNominal', parseFloat(e.target.value) || 0)}
                              style={{ width: '100px', padding: '4px 6px', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="number"
                              step="0.001"
                              value={errItem.errorEncontrado}
                              onChange={(e) => handleUpdatePuntoEnsayo(idx, 'errorEncontrado', parseFloat(e.target.value) || 0)}
                              style={{ width: '100px', padding: '4px 6px', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              type="number"
                              step="0.001"
                              value={errItem.errorMaximoPermitido}
                              onChange={(e) => handleUpdatePuntoEnsayo(idx, 'errorMaximoPermitido', parseFloat(e.target.value) || 0)}
                              style={{ width: '100px', padding: '4px 6px', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <span className={`status-pill ${errItem.cumple ? 'ok' : 'danger'}`}>
                              {errItem.cumple ? 'CONFORME' : 'NO CONFORME'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemovePuntoEnsayo(idx)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                              <TrashIcon size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pie del Modal */}
        {!issuedCertId && (
          <div
            style={{
              padding: '14px 24px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              {!isCompletenessValid ? (
                <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangleIcon size={14} />
                  Calibración incompleta (se requiere al menos 1 patrón y 1 punto de ensayo).
                </span>
              ) : (
                <span style={{ color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckIcon size={14} />
                  Completitud técnica metrológica validada.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-gov-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-gov-primary"
                disabled={submitting || !isCompletenessValid}
                onClick={handleSubmit}
                style={{ gap: '6px' }}
              >
                <ShieldCheckIcon size={16} />
                <span>{submitting ? 'Emitiendo y Sellando...' : 'Emitir y Sellar Certificado'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal de Visualización Interactiva Oficial de Certificado PDF */}
        {issuedCertId && (
          <PdfCertificateViewerModal
            isOpen={isPdfModalOpen}
            certIdOrFolio={issuedCertId}
            title={`Certificado Oficial Emitido · ${numeroCertificado}`}
            metadata={{
              estado: resultado.toUpperCase(),
              laboratorioOEC: laboratorioAcreditado,
              fechaEmision: fechaCalibracion,
              fechaVencimiento: fechaProximaCalibracion,
              precintoSIMEL: codigoPrecintoSIMEL,
            }}
            onClose={() => setIsPdfModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
