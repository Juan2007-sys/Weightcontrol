import React, { useState } from 'react';
import { QrCodeIcon, CheckIcon, AlertTriangleIcon } from '../common/Icons';
import { instrumentosService } from '../../services/instrumentos.service';
import type { CreateInstrumentoPayload } from '../../services/instrumentos.service';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface RegisterInstrumentViewProps {
  onBackToAudit: () => void;
  onRegisteredSuccess?: () => void;
}

export const RegisterInstrumentView: React.FC<RegisterInstrumentViewProps> = ({ onBackToAudit, onRegisteredSuccess }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Datos del formulario
  const [formData, setFormData] = useState({
    serial: 'BAL-2025-99410-BOG',
    tipo: 'IPFNA Clase III (Báscula de mostrador comercial)',
    marca: 'Torrey',
    modelo: 'L-EQ-10/20',
    capacidadMax: '30',
    divisionEscala: '5',
    establecimiento: 'DISTRIBUIDORA DE ALIMENTOS DEL CENTRO S.A.S.',
    nit: '901.442.190-3',
    departamento: 'Cundinamarca',
    municipio: 'Bogotá D.C.',
    direccion: 'Carrera 13 # 65-22 Local 102',
    precintoSIMEL: 'STAMP-CO-9982550',
    oecAcreditado: 'ONAC-18-LAB-042 (Laboratorio Metrológico Nacional)',
    fechaUltimaCalibracion: '2025-05-14',
    fechaProximaCalibracion: '2026-05-14',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Cálculo de divisiones n = Max / e
  const maxKg = parseFloat(formData.capacidadMax) || 0;
  const eGram = parseFloat(formData.divisionEscala) || 1;
  const nDivisions = (maxKg * 1000) / eGram;
  const isNtc2031Valid = nDivisions >= 500 && nDivisions <= 10000;

  const progressPercentage = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="gov-container">
        {/* Encabezado del Formulario con Barra Azul de 4px */}
        <div
          style={{
            borderLeft: '4px solid var(--blue-600)',
            paddingLeft: '18px',
            marginBottom: '24px',
          }}
        >
          <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
            MÓDULO TÉCNICO REGISTRAL · SISTEMA INTEGRADO DE CONTROL METROLÓGICO
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
            Registrar Nuevo Instrumento Metrológico
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Inscripción obligatoria en el RUMP bajo lineamientos técnicos de la norma <strong>NTC 2031</strong> y el <strong>Decreto 1074 de 2015</strong>.
          </p>
        </div>

        {/* Stepper Horizontal de 3 Fases con Barra de Progreso */}
        <div
          className="gov-card"
          style={{
            padding: '18px 24px',
            marginBottom: '24px',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Fases del Stepper */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            {/* Fase 1 */}
            <div
              onClick={() => setCurrentStep(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: currentStep === 1 ? 'var(--navy-900)' : currentStep > 1 ? 'var(--blue-50)' : '#F1F5F9',
                color: currentStep === 1 ? '#FFFFFF' : currentStep > 1 ? 'var(--navy-900)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 1 ? 'var(--blue-600)' : currentStep > 1 ? 'var(--ok)' : '#CBD5E1',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {currentStep > 1 ? <CheckIcon size={14} /> : '1'}
              </div>
              <div>
                <div className="microlabel-sm" style={{ opacity: 0.75 }}>FASE 01</div>
                <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Chasis y Metrología
                </div>
              </div>
            </div>

            {/* Fase 2 */}
            <div
              onClick={() => setCurrentStep(2)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: currentStep === 2 ? 'var(--navy-900)' : currentStep > 2 ? 'var(--blue-50)' : '#F1F5F9',
                color: currentStep === 2 ? '#FFFFFF' : currentStep > 2 ? 'var(--navy-900)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 2 ? 'var(--blue-600)' : currentStep > 2 ? 'var(--ok)' : '#CBD5E1',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {currentStep > 2 ? <CheckIcon size={14} /> : '2'}
              </div>
              <div>
                <div className="microlabel-sm" style={{ opacity: 0.75 }}>FASE 02</div>
                <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Establecimiento y Sujeto
                </div>
              </div>
            </div>

            {/* Fase 3 */}
            <div
              onClick={() => setCurrentStep(3)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: currentStep === 3 ? 'var(--navy-900)' : '#F1F5F9',
                color: currentStep === 3 ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 3 ? 'var(--blue-600)' : '#CBD5E1',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                3
              </div>
              <div>
                <div className="microlabel-sm" style={{ opacity: 0.75 }}>FASE 03</div>
                <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Precinto SIC y Certificado
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
              <span className="microlabel" style={{ color: 'var(--text-muted)' }}>PROGRESO DEL DILIGENCIAMIENTO</span>
              <strong className="font-mono" style={{ color: 'var(--navy-900)' }}>{progressPercentage}% COMPLETADO</strong>
            </div>
            <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPercentage}%`,
                  backgroundColor: 'var(--navy-900)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Estructura Principal: Formulario a la Izquierda + Ficha de Pre-Validación y Rótulo QR a la Derecha */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.3fr) minmax(320px, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Panel Izquierdo: Pasos del Formulario */}
          <div className="gov-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
            {currentStep === 1 && (
              <div>
                <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  FASE 01 · CARACTERÍSTICAS TÉCNICAS Y METROLÓGICAS (NTC 2031)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label htmlFor="reg-serial" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      NÚMERO DE SERIE FÍSICO (TROQUELADO EN PLACA)
                    </label>
                    <input
                      id="reg-serial"
                      type="text"
                      className="font-mono"
                      value={formData.serial}
                      onChange={(e) => handleChange('serial', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-input)',
                        border: '1px solid var(--border-strong)',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-type" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      TIPO DE INSTRUMENTO REGLAMENTADO
                    </label>
                    <select
                      id="reg-type"
                      value={formData.tipo}
                      onChange={(e) => handleChange('tipo', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-input)',
                        border: '1px solid var(--border-strong)',
                      }}
                    >
                      <option>IPFNA Clase III (Báscula de mostrador comercial)</option>
                      <option>Báscula Camionera de Plataforma Clase III</option>
                      <option>Dispensador / Surtidor de Combustibles Líquidos</option>
                      <option>Pesa Patrón de Verificación Clase M1 / F2</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="reg-brand" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        MARCA
                      </label>
                      <input
                        id="reg-brand"
                        type="text"
                        value={formData.marca}
                        onChange={(e) => handleChange('marca', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-model" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        MODELO
                      </label>
                      <input
                        id="reg-model"
                        type="text"
                        value={formData.modelo}
                        onChange={(e) => handleChange('modelo', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="reg-max" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        CAPACIDAD MÁXIMA (Max en kg)
                      </label>
                      <input
                        id="reg-max"
                        type="number"
                        className="font-mono"
                        value={formData.capacidadMax}
                        onChange={(e) => handleChange('capacidadMax', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-e" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        DIVISIÓN ESCALA VERIFICACIÓN (e en gramos)
                      </label>
                      <input
                        id="reg-e"
                        type="number"
                        className="font-mono"
                        value={formData.divisionEscala}
                        onChange={(e) => handleChange('divisionEscala', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                  </div>

                  {/* Verificación de regla NTC 2031 */}
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-card)',
                      backgroundColor: isNtc2031Valid ? 'var(--ok-bg)' : 'var(--warn-bg)',
                      border: `1px solid ${isNtc2031Valid ? 'rgba(14, 159, 110, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
                      fontSize: '12px',
                    }}
                  >
                    <span className="microlabel" style={{ color: 'var(--navy-900)' }}>MOTOR DE VALIDACIÓN NTC 2031:</span>
                    <div style={{ marginTop: '3px' }}>
                      Número de divisiones $n = Max / e$: <strong className="font-mono">{nDivisions.toLocaleString()}</strong>.
                      {' '}{isNtc2031Valid ? 'Cumple rango Clase III (500 ≤ n ≤ 10.000).' : 'Alerta: n fuera del rango estándar.'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-gov-primary"
                    onClick={() => setCurrentStep(2)}
                  >
                    Continuar a Fase 02 →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  FASE 02 · ESTABLECIMIENTO DE COMERCIO Y SUJETO RESPONSABLE
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label htmlFor="reg-establishment" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      RAZÓN SOCIAL / NOMBRE COMERCIAL
                    </label>
                    <input
                      id="reg-establishment"
                      type="text"
                      value={formData.establecimiento}
                      onChange={(e) => handleChange('establecimiento', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-nit" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      NÚMERO DE IDENTIFICACIÓN TRIBUTARIA (NIT CON DÍGITO)
                    </label>
                    <input
                      id="reg-nit"
                      type="text"
                      className="font-mono"
                      value={formData.nit}
                      onChange={(e) => handleChange('nit', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="reg-dep" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        DEPARTAMENTO
                      </label>
                      <input
                        id="reg-dep"
                        type="text"
                        value={formData.departamento}
                        onChange={(e) => handleChange('departamento', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-mun" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        MUNICIPIO
                      </label>
                      <input
                        id="reg-mun"
                        type="text"
                        value={formData.municipio}
                        onChange={(e) => handleChange('municipio', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-address" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      DIRECCIÓN EXACTA DEL PUNTO DE PESAJE
                    </label>
                    <input
                      id="reg-address"
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => handleChange('direccion', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className="btn-gov-secondary"
                    onClick={() => setCurrentStep(1)}
                  >
                    ← Volver a Fase 01
                  </button>
                  <button
                    type="button"
                    className="btn-gov-primary"
                    onClick={() => setCurrentStep(3)}
                  >
                    Continuar a Fase 03 →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  FASE 03 · PRECINTO SIMEL, DICTAMEN OEC Y VIGENCIA
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label htmlFor="reg-stamp" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      CÓDIGO OFICIAL DEL PRECINTO SIMEL (SERIE FÍSICA INALTERABLE)
                    </label>
                    <input
                      id="reg-stamp"
                      type="text"
                      className="font-mono"
                      value={formData.precintoSIMEL}
                      onChange={(e) => handleChange('precintoSIMEL', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-oec" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      ORGANISMO EVALUADOR DE LA CONFORMIDAD (OEC ACREDITADO ONAC)
                    </label>
                    <input
                      id="reg-oec"
                      type="text"
                      className="font-mono"
                      value={formData.oecAcreditado}
                      onChange={(e) => handleChange('oecAcreditado', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="reg-date1" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        FECHA CALIBRACIÓN CONFORME
                      </label>
                      <input
                        id="reg-date1"
                        type="date"
                        value={formData.fechaUltimaCalibracion}
                        onChange={(e) => handleChange('fechaUltimaCalibracion', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-date2" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        PRÓXIMA CALIBRACIÓN OBLIGATORIA
                      </label>
                      <input
                        id="reg-date2"
                        type="date"
                        value={formData.fechaProximaCalibracion}
                        onChange={(e) => handleChange('fechaProximaCalibracion', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    style={{
                      marginTop: '16px',
                      backgroundColor: 'var(--danger-bg)',
                      border: '1px solid var(--danger)',
                      color: '#991B1B',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-card)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangleIcon size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div
                    style={{
                      marginTop: '16px',
                      backgroundColor: 'var(--ok-bg)',
                      border: '1px solid var(--ok)',
                      color: '#065F46',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-card)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckIcon size={16} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className="btn-gov-secondary"
                    onClick={() => setCurrentStep(2)}
                  >
                    ← Volver a Fase 02
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    className="btn-gov-primary"
                    onClick={async () => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setSubmitting(true);
                      try {
                        const tipoMapeado = formData.tipo.includes('Pesa')
                          ? 'Pesa'
                          : formData.tipo.includes('Dinamometro')
                          ? 'Dinamometro'
                          : 'Bascula';

                        const payload: CreateInstrumentoPayload = {
                          serial: formData.serial.trim(),
                          marca: formData.marca.trim(),
                          modelo: formData.modelo.trim(),
                          tipo: tipoMapeado as any,
                          categoriaExactitud: 'Clase III',
                          capacidadMaxima: parseFloat(formData.capacidadMax) || 30,
                          unidadMedida: 'kg',
                          divisionEscala: parseFloat(formData.divisionEscala) || 5,
                          codigoPrecintoSIMEL: formData.precintoSIMEL.trim(),
                          propietario: {
                            nombreRazonSocial: formData.establecimiento.trim(),
                            nitRut: formData.nit.trim(),
                            direccion: formData.direccion.trim(),
                            ciudad: formData.municipio.trim(),
                            departamento: formData.departamento.trim(),
                          },
                          ubicacionFisica: formData.direccion.trim(),
                          fechaUltimaCalibracion: new Date(formData.fechaUltimaCalibracion).toISOString(),
                          fechaProximaCalibracion: new Date(formData.fechaProximaCalibracion).toISOString(),
                        };

                        await instrumentosService.create(payload);
                        confetti({
                          particleCount: 75,
                          spread: 60,
                          origin: { y: 0.6 },
                        });
                        toast.success(`Instrumento ${formData.serial} radicado exitosamente en el RUMP`);
                        setSuccessMsg(`¡Instrumento radicado con éxito en el RUMP bajo serial ${formData.serial}!`);
                        setTimeout(() => {
                          if (onRegisteredSuccess) {
                            onRegisteredSuccess();
                          } else {
                            onBackToAudit();
                          }
                        }, 1600);
                      } catch (err: any) {
                        setErrorMsg(err?.message || 'Error al radicar el instrumento en el backend');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    style={{ opacity: submitting ? 0.7 : 1 }}
                  >
                    <CheckIcon size={14} />
                    <span>{submitting ? 'Radicando en Base de Datos...' : 'Radicar Registro Oficial en RUMP'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panel Lateral: Ficha de Pre-Validación y Rótulo Metrológico Oficial con QR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              className="gov-card"
              style={{
                backgroundColor: '#FFFFFF',
                padding: '20px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '8px',
                  marginBottom: '14px',
                }}
              >
                <div className="microlabel" style={{ color: 'var(--navy-900)' }}>
                  FICHA DE PRE-VALIDACIÓN REGULATORIA
                </div>
                <span className="status-pill ok">PRE-APROBADO</span>
              </div>

              {/* Rótulo Metrológico Oficial SICM-COL con QR */}
              <div
                style={{
                  border: '2px solid #0B1F3F',
                  borderRadius: '6px',
                  backgroundColor: '#FFFBEB',
                  padding: '16px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Banda de Seguridad Verde Superior */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    backgroundColor: 'var(--ok)',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2px' }}>
                  <div>
                    <span
                      className="microlabel-sm"
                      style={{
                        backgroundColor: 'var(--navy-900)',
                        color: '#FFFFFF',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        fontWeight: 800,
                      }}
                    >
                      RÓTULO METROLÓGICO OFICIAL
                    </span>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)', marginTop: '6px', margin: '6px 0 2px 0' }}>
                      SICM-COL · VERIFICADO
                    </h4>
                    <div className="microlabel-sm font-mono" style={{ color: '#78350F' }}>
                      SUPERINTENDENCIA DE INDUSTRIA Y COMERCIO
                    </div>
                  </div>

                  {/* Código QR Oficial */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Código QR criptográfico trazable ante el RUMP"
                  >
                    <QrCodeIcon size={52} />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #D97706',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ color: '#92400E' }}>SERIAL EQUIPO:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                      {formData.serial}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#92400E' }}>PRECINTO SIMEL:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                      {formData.precintoSIMEL}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#92400E' }}>CAPACIDAD / DIV:</span>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      Max {formData.capacidadMax}kg / e={formData.divisionEscala}g
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#92400E' }}>CALIBRACIÓN VENCE:</span>
                    <div className="font-mono" style={{ fontWeight: 700, color: 'var(--ok)' }}>
                      {formData.fechaProximaCalibracion}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    color: '#78350F',
                    textAlign: 'center',
                  }}
                >
                  FIRMA HSM: 4a9f-88c2-19e0 · RAD-RUMP-COL-2025
                </div>
              </div>

              {/* Botón de regreso rápido */}
              <button
                type="button"
                className="btn-gov-secondary"
                onClick={onBackToAudit}
                style={{ width: '100%', marginTop: '16px' }}
              >
                Volver a la Matriz de Auditoría
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
