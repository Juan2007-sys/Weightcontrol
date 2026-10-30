import React, { useState, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { QrCodeIcon, CheckIcon, AlertTriangleIcon } from '../common/Icons';
import { instrumentosService } from '../../services/instrumentos.service';
import type { CreateInstrumentoPayload } from '../../services/instrumentos.service';
import type { MetrologicalInstrument } from '../../types/metrology';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { CapacityFormulasChart } from './CapacityFormulasChart';
import { RegistrationSuccessModal, type RegistrationSuccessData } from './RegistrationSuccessModal';

interface RegisterInstrumentViewProps {
  onBackToAudit: () => void;
  onRegisteredSuccess?: (newItem?: MetrologicalInstrument) => void;
  existingInstruments?: MetrologicalInstrument[];
  onConsultSerialImmediately?: (serial: string) => void;
}

/** Gramos por unidad de medida declarada; unica fuente para el chequeo NTC 2031 y el payload. */
const GRAMOS_POR_UNIDAD: Record<'kg' | 'g' | 'lb' | 't', number> = {
  g: 1,
  kg: 1000,
  t: 1000000,
  lb: 453.592,
};

export const RegisterInstrumentView: React.FC<RegisterInstrumentViewProps> = ({
  onBackToAudit,
  onRegisteredSuccess,
  existingInstruments = [],
  onConsultSerialImmediately,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [duplicateSerialError, setDuplicateSerialError] = useState<string | null>(null);
  const [duplicatePrecintoError, setDuplicatePrecintoError] = useState<string | null>(null);
  const [compressingField, setCompressingField] = useState<string | null>(null);
  const [successModalData, setSuccessModalData] = useState<RegistrationSuccessData | null>(null);
  // Errores devueltos por el servidor, indexados por campo del backend (HU-02: {campo, mensaje}).
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'fotoEquipo' | 'fotoPrecinto' | 'fotoUbicacion'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingField(field);
    const originalMb = (file.size / 1024 / 1024).toFixed(2);

    try {
      const options = {
        maxSizeMB: 0.35, // Comprime a máximo ~350KB
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const compressedKb = (compressedFile.size / 1024).toFixed(0);

      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleChange(field, base64);
        toast.success(
          `📸 Foto comprimida y optimizada: De ${originalMb} MB a ${compressedKb} KB`
        );
      };
    } catch {
      toast.error('Error al comprimir la fotografía en el navegador.');
    } finally {
      setCompressingField(null);
    }
  };

  const canRegister = isAuthenticated && user && (user.rol === 'ADMIN' || user.rol === 'TECNICO' || user.rol === 'INSTITUCION_ACREDITACION');

  // Helper para generar serial único garantizado
  const generateNewSerial = () => {
    let newSerial = '';
    let attempts = 0;
    do {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      newSerial = `BAL-2026-${randomSuffix}-BOG`;
      attempts++;
    } while (
      attempts < 50 &&
      existingInstruments.some((inst) => inst.serial.toUpperCase() === newSerial.toUpperCase())
    );
    return newSerial;
  };

  // Helper para validar si un serial ya existe localmente
  const validateSerialLocally = useCallback((serialVal: string): string | null => {
    const trimmed = serialVal.trim().toUpperCase();
    if (!trimmed) {
      return 'El número de serie físico es obligatorio.';
    }
    const exists = existingInstruments.some(
      (inst) => inst.serial.trim().toUpperCase() === trimmed,
    );
    if (exists) {
      return `⚠️ Conflicto de Duplicidad: Ya existe un instrumento registrado con el serial '${trimmed}' en el censo RUMP.`;
    }
    return null;
  }, [existingInstruments]);

  // Consulta asíncrona de duplicidad contra base de datos MongoDB
  const checkSerialInDatabase = useCallback(async (serialVal: string) => {
    const trimmed = serialVal.trim().toUpperCase();
    if (!trimmed) return;

    // 1. Revisión local
    const localErr = validateSerialLocally(trimmed);
    if (localErr) {
      setDuplicateSerialError(localErr);
      setErrorMsg(localErr);
      return;
    }

    // 2. Revisión remota en backend MongoDB
    try {
      const existingInDb = await instrumentosService.getBySerial(trimmed);
      if (existingInDb) {
        const msg = `⚠️ Conflicto en Base de Datos: Ya existe un instrumento registrado con el serial '${trimmed}' (Marca: ${existingInDb.marca} ${existingInDb.modelo} · ${existingInDb.establecimiento}).`;
        setDuplicateSerialError(msg);
        setErrorMsg(msg);
        toast.error(`⚠️ Instrumento Duplicado: El serial '${trimmed}' ya existe en la base de datos oficial.`, {
          duration: 6000,
        });
        return;
      }
    } catch {
      // 404 significa que el serial está disponible
    }

    setDuplicateSerialError(null);
    if (errorMsg && errorMsg.includes('serial')) {
      setErrorMsg(null);
    }
  }, [validateSerialLocally, errorMsg]);

  // Helper para validar si un precinto SIMEL ya existe
  const validatePrecintoUniqueness = (precintoVal: string): string | null => {
    const trimmed = precintoVal.trim().toUpperCase();
    if (!trimmed) {
      return null;
    }
    const exists = existingInstruments.some(
      (inst) => inst.precintoSIMEL && inst.precintoSIMEL.toUpperCase().includes(trimmed),
    );
    if (exists) {
      return `⚠️ Precinto Duplicado: El precinto '${trimmed}' ya se encuentra asignado a otro equipo metrológico.`;
    }
    return null;
  };

  // Datos del formulario: arranca vacio; cada campo guia con su placeholder. Los selectores
  // (tipo, clase, unidad) conservan una opcion valida porque no admiten estar vacios.
  const [formData, setFormData] = useState({
    serial: '',
    tipo: 'IPFNA Clase III (Báscula de mostrador comercial)',
    categoriaExactitud: 'Clase III' as 'Clase I' | 'Clase II' | 'Clase III' | 'Clase IIII',
    unidadMedida: 'kg' as 'kg' | 'g' | 'lb' | 't',
    marca: '',
    modelo: '',
    capacidadMax: '',
    capacidadMin: '',
    divisionEscala: '',
    fotoEquipo: '',
    fotoPrecinto: '',
    fotoUbicacion: '',
    establecimiento: '',
    nit: '',
    departamento: '',
    municipio: '',
    direccion: '',
    precintoSIMEL: '',
    oecAcreditado: '',
    fechaUltimaCalibracion: '',
    fechaProximaCalibracion: '',
  });

  // Campos que la persona ya toco: un campo vacio no se pinta en rojo hasta que se interactua con el.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const shown = (field: string, valid: boolean) => valid || !touched[field];

  // Validar el serial inicial al montar el componente
  useEffect(() => {
    checkSerialInDatabase(formData.serial);
  }, []);

  // Campo del backend -> id del input en el formulario.
  const FIELD_INPUT_ID: Record<string, string> = {
    serial: 'reg-serial',
    marca: 'reg-brand',
    modelo: 'reg-model',
    capacidadMaxima: 'reg-max',
    capacidadMinima: 'reg-min',
    unidadMedida: 'reg-unit',
    divisionEscala: 'reg-e',
    fotoEquipo: 'reg-foto-eq',
    fotoPrecinto: 'reg-foto-prec',
    fotoUbicacion: 'reg-foto-ub',
    codigoPrecintoSIMEL: 'reg-stamp',
    fechaProximaCalibracion: 'reg-date2',
  };
  // Campo del formulario -> campo del backend (solo donde difieren).
  const FORM_TO_BACKEND_FIELD: Record<string, string> = {
    capacidadMax: 'capacidadMaxima',
    capacidadMin: 'capacidadMinima',
    precintoSIMEL: 'codigoPrecintoSIMEL',
  };

  /** Atributos de accesibilidad de un campo: aria-invalid (local o de servidor) y aria-describedby al error. */
  const fieldA11y = (campo: string, localInvalid = false, localDescId?: string) => {
    const hasServerError = Boolean(serverFieldErrors[campo]);
    // aria-describedby referencia el mensaje de error de servidor y/o el mensaje local visible del campo.
    const ids = [
      hasServerError ? `${FIELD_INPUT_ID[campo]}-err` : null,
      localInvalid && localDescId ? localDescId : null,
    ].filter(Boolean) as string[];
    return {
      'aria-invalid': localInvalid || hasServerError ? (true as const) : undefined,
      'aria-describedby': ids.length ? ids.join(' ') : undefined,
    };
  };

  const renderFieldError = (campo: string) =>
    serverFieldErrors[campo] ? (
      <div
        id={`${FIELD_INPUT_ID[campo]}-err`}
        role="alert"
        style={{ marginTop: '4px', color: 'var(--danger)', fontSize: '12px', fontWeight: 600 }}
      >
        {serverFieldErrors[campo]}
      </div>
    ) : null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
    const backendField = FORM_TO_BACKEND_FIELD[field] ?? field;
    setServerFieldErrors((prev) => {
      if (!prev[backendField]) return prev;
      const { [backendField]: _removed, ...rest } = prev;
      return rest;
    });
    if (field === 'serial') {
      const err = validateSerialLocally(value);
      setDuplicateSerialError(err);
      if (err) {
        setErrorMsg(err);
      } else {
        checkSerialInDatabase(value);
      }
    }
    if (field === 'precintoSIMEL') {
      const err = validatePrecintoUniqueness(value);
      setDuplicatePrecintoError(err);
      if (err) {
        setErrorMsg(err);
      } else if (errorMsg && errorMsg.includes('precinto')) {
        setErrorMsg(null);
      }
    }
  };

  // Cálculo metrológico de divisiones n = Max / e y validaciones en tiempo real (NTC 2031 / OIML R 76)
  const maxVal = parseFloat(formData.capacidadMax) || 0;
  const minVal = parseFloat(formData.capacidadMin) || 0;
  const eGram = parseFloat(formData.divisionEscala) || 1;

  const isCapacityConsistent = minVal < maxVal && maxVal > 0;
  const capacityErrorText = !isCapacityConsistent
    ? `⚠️ Inconsistencia de Capacidades: La capacidad mínima (${minVal} ${formData.unidadMedida}) debe ser estrictamente menor que la capacidad máxima (${maxVal} ${formData.unidadMedida}).`
    : null;

  // Conversión a gramos para el cálculo de escalones n = Max / e
  const maxInGrams = maxVal * GRAMOS_POR_UNIDAD[formData.unidadMedida];

  const nDivisions = Math.round(maxInGrams / eGram);

  // Validación de escalones según la clase de exactitud declarada (NTC 2031)
  const getNtc2031Validation = () => {
    if (!isCapacityConsistent) {
      return {
        valid: false,
        message: 'No es posible evaluar escalones: Corrija la inconsistencia de capacidades Min >= Max.',
      };
    }
    switch (formData.categoriaExactitud) {
      case 'Clase I':
        if (nDivisions < 50000) {
          return {
            valid: false,
            message: `⚠️ Rechazo Metrológico NTC 2031: Clase I (Especial) exige n ≥ 50.000 escalones. Actual: n = ${nDivisions.toLocaleString()}.`,
          };
        }
        return {
          valid: true,
          message: `✅ Conforme NTC 2031 Clase I Especial (n = ${nDivisions.toLocaleString()} ≥ 50.000).`,
        };
      case 'Clase II':
        if (nDivisions < 100 || nDivisions > 100000) {
          return {
            valid: false,
            message: `⚠️ Rechazo Metrológico NTC 2031: Clase II (Fina) exige 100 ≤ n ≤ 100.000 escalones. Actual: n = ${nDivisions.toLocaleString()}.`,
          };
        }
        return {
          valid: true,
          message: `✅ Conforme NTC 2031 Clase II Fina (100 ≤ n = ${nDivisions.toLocaleString()} ≤ 100.000).`,
        };
      case 'Clase III':
        if (nDivisions < 500 || nDivisions > 10000) {
          return {
            valid: false,
            message: `⚠️ Rechazo Metrológico NTC 2031: Clase III (Media) exige 500 ≤ n ≤ 10.000 escalones. Actual: n = ${nDivisions.toLocaleString()}.`,
          };
        }
        return {
          valid: true,
          message: `✅ Conforme NTC 2031 Clase III Media (500 ≤ n = ${nDivisions.toLocaleString()} ≤ 10.000).`,
        };
      case 'Clase IIII':
        if (nDivisions < 100 || nDivisions > 1000) {
          return {
            valid: false,
            message: `⚠️ Rechazo Metrológico NTC 2031: Clase IIII (Ordinaria) exige 100 ≤ n ≤ 1.000 escalones. Actual: n = ${nDivisions.toLocaleString()}.`,
          };
        }
        return {
          valid: true,
          message: `✅ Conforme NTC 2031 Clase IIII Ordinaria (100 ≤ n = ${nDivisions.toLocaleString()} ≤ 1.000).`,
        };
      default:
        return { valid: true, message: `n = ${nDivisions.toLocaleString()}` };
    }
  };

  const ntcValidation = getNtc2031Validation();

  // Validación estricta de los 8 campos obligatorios y 3 fotografías (HU-01 y HU-02)
  const isSerialValid = formData.serial.trim().length > 0 && !duplicateSerialError;
  const isMarcaValid = formData.marca.trim().length > 0;
  const isModeloValid = formData.modelo.trim().length > 0;
  const isTipoValid = formData.tipo.trim().length > 0;
  const isClaseValid = formData.categoriaExactitud.trim().length > 0;
  const isCapacidadMaxValid = parseFloat(formData.capacidadMax) > 0;
  const isCapacidadMinValid = formData.capacidadMin !== '' && parseFloat(formData.capacidadMin) >= 0 && isCapacityConsistent;
  const isUnidadValid = formData.unidadMedida.trim().length > 0;
  const isDivisionEscalaValid = parseFloat(formData.divisionEscala) > 0 && ntcValidation.valid;
  const isFotoEquipoValid = formData.fotoEquipo.trim().length > 0;
  const isFotoPrecintoValid = formData.fotoPrecinto.trim().length > 0;
  const isFotoUbicacionValid = formData.fotoUbicacion.trim().length > 0;

  const isStep1Valid =
    isSerialValid &&
    isMarcaValid &&
    isModeloValid &&
    isTipoValid &&
    isClaseValid &&
    isCapacidadMaxValid &&
    isCapacidadMinValid &&
    isUnidadValid &&
    isDivisionEscalaValid &&
    isFotoEquipoValid &&
    isFotoPrecintoValid &&
    isFotoUbicacionValid;

  const handleStepTransition = async (targetStep: 1 | 2 | 3) => {
    if (targetStep > 1) {
      // 1. Validar serial
      const trimmed = formData.serial.trim().toUpperCase();
      const serialErr = validateSerialLocally(trimmed);
      if (serialErr) {
        setDuplicateSerialError(serialErr);
        setErrorMsg(serialErr);
        toast.error(serialErr, {
          duration: 6000,
          description: 'No se puede avanzar mientras el número de serie esté duplicado.',
        });
        setCurrentStep(1);
        return;
      }

      // Validar contra DB
      try {
        const inDb = await instrumentosService.getBySerial(trimmed);
        if (inDb) {
          const msg = `⚠️ Conflicto: El serial '${trimmed}' ya existe en la base de datos de MongoDB.`;
          setDuplicateSerialError(msg);
          setErrorMsg(msg);
          toast.error(msg, { duration: 6000 });
          setCurrentStep(1);
          return;
        }
      } catch {
        // Disponible
      }

      // 2. Validar consistencia de capacidades
      if (!isCapacityConsistent) {
        toast.error('⚠️ Inconsistencia: La capacidad mínima debe ser menor que la capacidad máxima.');
        setErrorMsg(capacityErrorText);
        setCurrentStep(1);
        return;
      }

      // 3. Validar escalones NTC 2031
      if (!ntcValidation.valid) {
        toast.error(`⚠️ Rechazo Metrológico: ${ntcValidation.message}`);
        setErrorMsg(ntcValidation.message);
        setCurrentStep(1);
        return;
      }

      if (!formData.marca.trim() || !formData.modelo.trim()) {
        toast.error('La marca y el modelo son campos obligatorios.');
        return;
      }
    }

    if (targetStep > 2) {
      if (!formData.establecimiento.trim() || !formData.nit.trim()) {
        toast.error('La razón social y el NIT del establecimiento son obligatorios.');
        return;
      }
    }

    setErrorMsg(null);
    setCurrentStep(targetStep);
  };

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

        {/* Banner de Verificación de Sesión Técnica para Demostración */}
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
              onClick={() => handleStepTransition(1)}
              role="button"
              tabIndex={0}
              aria-current={currentStep === 1 ? 'step' : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStepTransition(1); } }}
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
                <div className="microlabel-sm">FASE 01</div>
                <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Chasis y Metrología
                </div>
              </div>
            </div>

            {/* Fase 2 */}
            <div
              onClick={() => handleStepTransition(2)}
              role="button"
              tabIndex={0}
              aria-current={currentStep === 2 ? 'step' : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStepTransition(2); } }}
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
                <div className="microlabel-sm">FASE 02</div>
                <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Establecimiento y Sujeto
                </div>
              </div>
            </div>

            {/* Fase 3 */}
            <div
              onClick={() => handleStepTransition(3)}
              role="button"
              tabIndex={0}
              aria-current={currentStep === 3 ? 'step' : undefined}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStepTransition(3); } }}
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
                <div className="microlabel-sm">FASE 03</div>
                <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Precinto SIC y Certificado
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <label htmlFor="reg-serial" className="microlabel" style={{ color: 'var(--text-muted)' }}>
                        NÚMERO DE SERIE FÍSICO (TROQUELADO EN PLACA)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const newSerial = generateNewSerial();
                            handleChange('serial', newSerial);
                            setDuplicateSerialError(null);
                            toast.info(`Nuevo serial libre generado: ${newSerial}`);
                          }}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #93C5FD',
                            color: '#1D4ED8',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                          title="Generar un serial aleatorio libre que no exista"
                        >
                          Generar serial libre
                        </button>
                      </div>
                    </div>
                    <input
                      id="reg-serial"
                        {...fieldA11y('serial', Boolean(duplicateSerialError), 'reg-serial-dup')}
                      type="text"
                      className="font-mono"
                      value={formData.serial}
                      onChange={(e) => handleChange('serial', e.target.value)}
                      onBlur={(e) => checkSerialInDatabase(e.target.value)}
                      placeholder="Ej: BAL-2026-99201-BOG"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-input)',
                        border: duplicateSerialError ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                        backgroundColor: duplicateSerialError ? '#FEF2F2' : '#FFFFFF',
                        fontWeight: 600,
                        color: duplicateSerialError ? 'var(--danger)' : 'inherit',
                      }}
                    />
                      {renderFieldError('serial')}
                    {duplicateSerialError && (
                      <div
                        id="reg-serial-dup"
                        role="alert"
                        style={{
                          marginTop: '6px',
                          padding: '10px 12px',
                          backgroundColor: 'var(--danger-bg)',
                          border: '1px solid var(--danger)',
                          borderRadius: 'var(--radius-input)',
                          color: 'var(--danger)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <AlertTriangleIcon size={16} />
                          <span>{duplicateSerialError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newSerial = generateNewSerial();
                            handleChange('serial', newSerial);
                            setDuplicateSerialError(null);
                          }}
                          style={{
                            backgroundColor: 'var(--danger)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Generar serial libre
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
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
                        <option>Balanza Analítica de Precisión Clase I / II</option>
                        <option>Dispensador / Surtidor de Combustibles Líquidos</option>
                        <option>Pesa Patrón de Verificación Clase M1 / F2</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reg-class" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        CLASE DE EXACTITUD (NTC 2031 / OIML R 76)
                      </label>
                      <select
                        id="reg-class"
                        value={formData.categoriaExactitud}
                        onChange={(e) => handleChange('categoriaExactitud', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: '1px solid var(--border-strong)',
                          fontWeight: 600,
                        }}
                      >
                        <option value="Clase I">Clase I (Especial - n ≥ 50.000)</option>
                        <option value="Clase II">Clase II (Fina - 100 ≤ n ≤ 100.000)</option>
                        <option value="Clase III">Clase III (Media - 500 ≤ n ≤ 10.000)</option>
                        <option value="Clase IIII">Clase IIII (Ordinaria - 100 ≤ n ≤ 1.000)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label id="reg-brand-label" htmlFor="reg-brand" className="microlabel" style={{ display: 'block', color: !shown('marca', isMarcaValid) ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                        MARCA {!shown('marca', isMarcaValid) && '(CAMPO OBLIGATORIO)'}
                      </label>
                      <input
                        id="reg-brand"
                        {...fieldA11y('marca', !shown('marca', isMarcaValid), 'reg-brand-label')}
                        type="text"
                        value={formData.marca}
                        onChange={(e) => handleChange('marca', e.target.value)}
                        placeholder="Ej: Torrey, Mettler Toledo"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: !shown('marca', isMarcaValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                          backgroundColor: !shown('marca', isMarcaValid) ? '#FEF2F2' : '#FFFFFF',
                          fontWeight: 600,
                        }}
                      />
                      {renderFieldError('marca')}
                    </div>
                    <div>
                      <label id="reg-model-label" htmlFor="reg-model" className="microlabel" style={{ display: 'block', color: !shown('modelo', isModeloValid) ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                        MODELO {!shown('modelo', isModeloValid) && '(CAMPO OBLIGATORIO)'}
                      </label>
                      <input
                        id="reg-model"
                        {...fieldA11y('modelo', !shown('modelo', isModeloValid), 'reg-model-label')}
                        type="text"
                        value={formData.modelo}
                        onChange={(e) => handleChange('modelo', e.target.value)}
                        placeholder="Ej: L-EQ-10/20"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: !shown('modelo', isModeloValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                          backgroundColor: !shown('modelo', isModeloValid) ? '#FEF2F2' : '#FFFFFF',
                          fontWeight: 600,
                        }}
                      />
                      {renderFieldError('modelo')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label htmlFor="reg-max" className="microlabel" style={{ display: 'block', color: !shown('capacidadMax', isCapacidadMaxValid) ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                        CAPACIDAD MÁXIMA (Max) {!shown('capacidadMax', isCapacidadMaxValid) && '(> 0)'}
                      </label>
                      <input
                        id="reg-max"
                      placeholder="Ej: 30"
                        {...fieldA11y('capacidadMaxima', !shown('capacidadMax', isCapacidadMaxValid), 'reg-capacity-err')}
                        type="number"
                        className="font-mono"
                        value={formData.capacidadMax}
                        onChange={(e) => handleChange('capacidadMax', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: !shown('capacidadMax', isCapacidadMaxValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                          backgroundColor: !shown('capacidadMax', isCapacidadMaxValid) ? '#FEF2F2' : '#FFFFFF',
                          fontWeight: 700,
                        }}
                      />
                      {renderFieldError('capacidadMaxima')}
                    </div>
                    <div>
                      <label htmlFor="reg-min" className="microlabel" style={{ display: 'block', color: !shown('capacidadMin', isCapacidadMinValid) ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                        CAPACIDAD MÍNIMA (Min) {!shown('capacidadMin', isCapacidadMinValid) && '(< Max)'}
                      </label>
                      <input
                        id="reg-min"
                      placeholder="Ej: 0.1"
                        {...fieldA11y('capacidadMinima', !shown('capacidadMin', isCapacidadMinValid), 'reg-capacity-err')}
                        type="number"
                        step="0.01"
                        className="font-mono"
                        value={formData.capacidadMin}
                        onChange={(e) => handleChange('capacidadMin', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: !shown('capacidadMin', isCapacidadMinValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                          backgroundColor: !shown('capacidadMin', isCapacidadMinValid) ? '#FEF2F2' : '#FFFFFF',
                          fontWeight: 700,
                        }}
                      />
                      {renderFieldError('capacidadMinima')}
                    </div>
                    <div>
                      <label id="reg-unit-label" htmlFor="reg-unit" className="microlabel" style={{ display: 'block', color: !isUnidadValid ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                        UNIDAD DE MEDIDA
                      </label>
                      <select
                        id="reg-unit"
                        {...fieldA11y('unidadMedida', !isUnidadValid, 'reg-unit-label')}
                        value={formData.unidadMedida}
                        onChange={(e) => handleChange('unidadMedida', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: !isUnidadValid ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                          backgroundColor: !isUnidadValid ? '#FEF2F2' : '#FFFFFF',
                          fontWeight: 600,
                        }}
                      >
                        <option value="kg">kg (Kilogramos)</option>
                        <option value="g">g (Gramos)</option>
                        <option value="t">t (Toneladas)</option>
                        <option value="lb">lb (Libras)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reg-e" className="microlabel" style={{ display: 'block', color: !shown('divisionEscala', isDivisionEscalaValid) ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '6px' }}>
                        DIVISIÓN ESCALA (e en g) {!shown('divisionEscala', isDivisionEscalaValid) && '(RECHAZADO)'}
                      </label>
                      <input
                        id="reg-e"
                      placeholder="Ej: 5 (en gramos)"
                        {...fieldA11y('divisionEscala', !shown('divisionEscala', isDivisionEscalaValid), 'reg-ntc-msg')}
                        type="number"
                        className="font-mono"
                        value={formData.divisionEscala}
                        onChange={(e) => handleChange('divisionEscala', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-input)',
                          border: !shown('divisionEscala', isDivisionEscalaValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                          backgroundColor: !shown('divisionEscala', isDivisionEscalaValid) ? '#FEF2F2' : '#FFFFFF',
                          fontWeight: 700,
                        }}
                      />
                      {renderFieldError('divisionEscala')}
                    </div>
                  </div>

                  {!(touched.capacidadMax || touched.capacidadMin || touched.divisionEscala) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px 12px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-card)' }}>
                      Ingrese la capacidad máxima, la mínima y la división de escala para ver la gráfica y la validación NTC 2031.
                    </div>
                  )}
                  {(touched.capacidadMax || touched.capacidadMin) && (
                    <>
                  {/* Componente Reactivo de Gráficas y Fórmulas Matemáticas Metrológicas (HU-02) */}
                  <CapacityFormulasChart
                    capacidadMin={minVal}
                    capacidadMax={maxVal}
                    unidadMedida={formData.unidadMedida}
                    divisionEscala={eGram}
                  />
                    </>
                  )}

                  {/* Alerta Roja Visual de Inconsistencia de Capacidades (HU-02) */}
                  {!isCapacityConsistent && (touched.capacidadMax || touched.capacidadMin) && (
                    <div
                      id="reg-capacity-err"
                      role="alert"
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--danger-bg)',
                        border: '2px solid var(--danger)',
                        borderRadius: 'var(--radius-card)',
                        color: 'var(--danger)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertTriangleIcon size={18} />
                      <span>{capacityErrorText}</span>
                    </div>
                  )}

                  {(touched.capacidadMax || touched.capacidadMin || touched.divisionEscala) && (
                    <>
                  {/* Motor de Validación Metrológica NTC 2031 */}
                  <div
                    id="reg-ntc-msg"
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-card)',
                      backgroundColor: ntcValidation.valid ? 'var(--ok-bg)' : 'var(--danger-bg)',
                      border: `1.5px solid ${ntcValidation.valid ? 'var(--ok)' : 'var(--danger)'}`,
                      fontSize: '12px',
                      color: ntcValidation.valid ? '#065F46' : 'var(--danger)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="microlabel" style={{ color: ntcValidation.valid ? '#065F46' : 'var(--danger)' }}>
                        MOTOR METROLÓGICO NTC 2031 / OIML R 76:
                      </span>
                      <span className={`status-pill ${ntcValidation.valid ? 'ok' : 'danger'}`}>
                        {ntcValidation.valid ? 'CONFORME' : 'RECHAZADO'}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', fontWeight: 600 }}>
                      {ntcValidation.message}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>
                      Escalones de verificación calculados: n = Max / e = ({maxInGrams.toLocaleString()} g / {eGram} g) = <strong>{nDivisions.toLocaleString()} escalones</strong>.
                    </div>
                  </div>
                    </>
                  )}

                  {/* Evidencias Fotográficas Obligatorias con Preview Visual y Compresión Automática (HU-01) */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h2 id="reg-evidencias-title" className="microlabel" style={{ color: 'var(--navy-900)', margin: 0 }}>
                        EVIDENCIAS FOTOGRÁFICAS OBLIGATORIAS (MÉTODO FORENSE NTC 2031)
                      </h2>
                      <span className="microlabel-sm" style={{ color: 'var(--blue-600)', backgroundColor: 'var(--blue-50)', padding: '2px 6px', borderRadius: '3px' }}>
                        ⚡ Auto-compresión a ~250KB activada
                      </span>
                    </div>

                    <div role="group" aria-labelledby="reg-evidencias-title" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      {/* Foto 1: Equipo */}
                      <div style={{ border: !shown('fotoEquipo', isFotoEquipoValid) ? '2px dashed var(--danger)' : '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '10px', backgroundColor: !shown('fotoEquipo', isFotoEquipoValid) ? '#FEF2F2' : '#F8FAFC' }}>
                        <label id="reg-foto-eq-label" htmlFor="reg-foto-eq" style={{ fontSize: '12px', fontWeight: 700, color: !shown('fotoEquipo', isFotoEquipoValid) ? 'var(--danger)' : 'var(--navy-900)', display: 'block', marginBottom: '4px' }}>
                          1. Foto Instrumento Completo {!shown('fotoEquipo', isFotoEquipoValid) && '(OBLIGATORIA)'}
                        </label>
                        <div style={{ marginBottom: '6px' }}>
                          <label
                            style={{
                              display: 'block',
                              padding: '5px 8px',
                              backgroundColor: compressingField === 'fotoEquipo' ? '#FEF3C7' : '#EFF6FF',
                              border: '1px dashed var(--blue-600)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: 'var(--blue-600)',
                              textAlign: 'center',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {compressingField === 'fotoEquipo' ? '⏳ Comprimiendo...' : '📁 Subir foto del equipo'}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleFileUpload(e, 'fotoEquipo')}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <input
                          id="reg-foto-eq"
                        {...fieldA11y('fotoEquipo', !shown('fotoEquipo', isFotoEquipoValid), 'reg-foto-eq-label')}
                          type="text"
                          value={formData.fotoEquipo.startsWith('data:') ? '[Foto Comprimida en Base64]' : formData.fotoEquipo}
                          onChange={(e) => handleChange('fotoEquipo', e.target.value)}
                          placeholder="O ingrese URL directa"
                          style={{ width: '100%', padding: '5px 8px', fontSize: '12px', borderRadius: 'var(--radius-input)', border: !shown('fotoEquipo', isFotoEquipoValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)', marginBottom: '6px' }}
                        />
                      {renderFieldError('fotoEquipo')}
                        <div style={{ height: '80px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {formData.fotoEquipo ? (
                            <img
                              src={formData.fotoEquipo}
                              alt="Instrumento"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x100?text=Foto+Equipo'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin imagen</span>
                          )}
                        </div>
                      </div>

                      {/* Foto 2: Precinto */}
                      <div style={{ border: !shown('fotoPrecinto', isFotoPrecintoValid) ? '2px dashed var(--danger)' : '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '10px', backgroundColor: !shown('fotoPrecinto', isFotoPrecintoValid) ? '#FEF2F2' : '#F8FAFC' }}>
                        <label id="reg-foto-prec-label" htmlFor="reg-foto-prec" style={{ fontSize: '12px', fontWeight: 700, color: !shown('fotoPrecinto', isFotoPrecintoValid) ? 'var(--danger)' : 'var(--navy-900)', display: 'block', marginBottom: '4px' }}>
                          2. Foto Precinto SIMEL {!shown('fotoPrecinto', isFotoPrecintoValid) && '(OBLIGATORIA)'}
                        </label>
                        <div style={{ marginBottom: '6px' }}>
                          <label
                            style={{
                              display: 'block',
                              padding: '5px 8px',
                              backgroundColor: compressingField === 'fotoPrecinto' ? '#FEF3C7' : '#EFF6FF',
                              border: '1px dashed var(--blue-600)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: 'var(--blue-600)',
                              textAlign: 'center',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {compressingField === 'fotoPrecinto' ? '⏳ Comprimiendo...' : '📁 Subir foto del precinto'}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleFileUpload(e, 'fotoPrecinto')}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <input
                          id="reg-foto-prec"
                        {...fieldA11y('fotoPrecinto', !shown('fotoPrecinto', isFotoPrecintoValid), 'reg-foto-prec-label')}
                          type="text"
                          value={formData.fotoPrecinto.startsWith('data:') ? '[Foto Comprimida en Base64]' : formData.fotoPrecinto}
                          onChange={(e) => handleChange('fotoPrecinto', e.target.value)}
                          placeholder="O ingrese URL directa"
                          style={{ width: '100%', padding: '5px 8px', fontSize: '12px', borderRadius: 'var(--radius-input)', border: !shown('fotoPrecinto', isFotoPrecintoValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)', marginBottom: '6px' }}
                        />
                      {renderFieldError('fotoPrecinto')}
                        <div style={{ height: '80px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {formData.fotoPrecinto ? (
                            <img
                              src={formData.fotoPrecinto}
                              alt="Precinto"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x100?text=Foto+Precinto'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin imagen</span>
                          )}
                        </div>
                      </div>

                      {/* Foto 3: Ubicación */}
                      <div style={{ border: !shown('fotoUbicacion', isFotoUbicacionValid) ? '2px dashed var(--danger)' : '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '10px', backgroundColor: !shown('fotoUbicacion', isFotoUbicacionValid) ? '#FEF2F2' : '#F8FAFC' }}>
                        <label id="reg-foto-ub-label" htmlFor="reg-foto-ub" style={{ fontSize: '12px', fontWeight: 700, color: !shown('fotoUbicacion', isFotoUbicacionValid) ? 'var(--danger)' : 'var(--navy-900)', display: 'block', marginBottom: '4px' }}>
                          3. Foto Ubicación en Local {!shown('fotoUbicacion', isFotoUbicacionValid) && '(OBLIGATORIA)'}
                        </label>
                        <div style={{ marginBottom: '6px' }}>
                          <label
                            style={{
                              display: 'block',
                              padding: '5px 8px',
                              backgroundColor: compressingField === 'fotoUbicacion' ? '#FEF3C7' : '#EFF6FF',
                              border: '1px dashed var(--blue-600)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: 'var(--blue-600)',
                              textAlign: 'center',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {compressingField === 'fotoUbicacion' ? '⏳ Comprimiendo...' : '📁 Subir foto del ubicación'}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleFileUpload(e, 'fotoUbicacion')}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <input
                          id="reg-foto-ub"
                        {...fieldA11y('fotoUbicacion', !shown('fotoUbicacion', isFotoUbicacionValid), 'reg-foto-ub-label')}
                          type="text"
                          value={formData.fotoUbicacion.startsWith('data:') ? '[Foto Comprimida en Base64]' : formData.fotoUbicacion}
                          onChange={(e) => handleChange('fotoUbicacion', e.target.value)}
                          placeholder="O ingrese URL directa"
                          style={{ width: '100%', padding: '5px 8px', fontSize: '12px', borderRadius: 'var(--radius-input)', border: !shown('fotoUbicacion', isFotoUbicacionValid) ? '2px solid var(--danger)' : '1px solid var(--border-strong)', marginBottom: '6px' }}
                        />
                      {renderFieldError('fotoUbicacion')}
                        <div style={{ height: '80px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {formData.fotoUbicacion ? (
                            <img
                              src={formData.fotoUbicacion}
                              alt="Ubicación"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/200x100?text=Foto+Ubicacion'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin imagen</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  {!isStep1Valid && (
                    <div style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangleIcon size={16} />
                      <span>Exigido: Los 8 campos metrológicos y las 3 evidencias fotográficas deben estar diligenciados.</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-gov-primary"
                    disabled={!isStep1Valid}
                    onClick={() => handleStepTransition(2)}
                    style={{
                      opacity: !isStep1Valid ? 0.5 : 1,
                      cursor: !isStep1Valid ? 'not-allowed' : 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    {!isStep1Valid ? 'Diligencie todos los campos requeridos' : 'Continuar a Fase 02 →'}
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
                      placeholder="Ej: Distribuidora de Alimentos del Centro S.A.S."
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
                      placeholder="Ej: 901.442.190-3"
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
                      placeholder="Ej: Cundinamarca"
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
                      placeholder="Ej: Bogotá D.C."
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
                      placeholder="Ej: Carrera 13 # 65-22 Local 102"
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
                    onClick={() => handleStepTransition(1)}
                  >
                    ← Volver a Fase 01
                  </button>
                  <button
                    type="button"
                    className="btn-gov-primary"
                    onClick={() => handleStepTransition(3)}
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
                      placeholder="Ej: STAMP-CO-9982415"
                        {...fieldA11y('codigoPrecintoSIMEL', Boolean(duplicatePrecintoError), 'reg-stamp-dup')}
                      type="text"
                      className="font-mono"
                      value={formData.precintoSIMEL}
                      onChange={(e) => handleChange('precintoSIMEL', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-input)',
                        border: duplicatePrecintoError ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
                        backgroundColor: duplicatePrecintoError ? '#FEF2F2' : '#FFFFFF',
                        fontWeight: 700,
                      }}
                    />
                      {renderFieldError('codigoPrecintoSIMEL')}
                    {duplicatePrecintoError && (
                      <div
                        id="reg-stamp-dup"
                        role="alert"
                        style={{
                          marginTop: '6px',
                          padding: '8px 12px',
                          backgroundColor: 'var(--danger-bg)',
                          border: '1px solid var(--danger)',
                          borderRadius: 'var(--radius-input)',
                          color: 'var(--danger)',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangleIcon size={14} />
                        <span>{duplicatePrecintoError}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-oec" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      ORGANISMO EVALUADOR DE LA CONFORMIDAD (OEC ACREDITADO ONAC)
                    </label>
                    <input
                      id="reg-oec"
                      placeholder="Ej: ONAC-18-LAB-042"
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
                        {...fieldA11y('fechaProximaCalibracion')}
                        type="date"
                        value={formData.fechaProximaCalibracion}
                        onChange={(e) => handleChange('fechaProximaCalibracion', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      />
                      {renderFieldError('fechaProximaCalibracion')}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    style={{
                      marginTop: '16px',
                      backgroundColor: 'var(--danger-bg)',
                      border: '1px solid var(--danger)',
                      color: 'var(--danger)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-card)',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <AlertTriangleIcon size={16} />
                      <span>{errorMsg}</span>
                    </div>
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
                    onClick={() => handleStepTransition(2)}
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
                      setServerFieldErrors({});

                      // Validación preventiva de duplicidad en serial
                      const serialErr = validateSerialLocally(formData.serial);
                      if (serialErr) {
                        setDuplicateSerialError(serialErr);
                        setErrorMsg(serialErr);
                        toast.error(serialErr, { duration: 7000 });
                        setCurrentStep(1);
                        return;
                      }

                      if (!formData.fechaUltimaCalibracion || !formData.fechaProximaCalibracion) {
                        const m = 'Indique la fecha de la última calibración y la de la próxima calibración.';
                        setErrorMsg(m);
                        toast.error(m);
                        return;
                      }
                      if (formData.fechaProximaCalibracion <= formData.fechaUltimaCalibracion) {
                        const m = 'La fecha de próxima calibración debe ser posterior a la de la última calibración.';
                        setErrorMsg(m);
                        toast.error(m);
                        return;
                      }

                      // Validación preventiva de duplicidad en precinto
                      const precintoErr = validatePrecintoUniqueness(formData.precintoSIMEL);
                      if (precintoErr) {
                        setDuplicatePrecintoError(precintoErr);
                        setErrorMsg(precintoErr);
                        toast.error(precintoErr, { duration: 7000 });
                        return;
                      }

                      setSubmitting(true);
                      try {
                        // Nunca se inicia sesion en silencio: sin un rol autorizado no se envia nada.
                        if (!canRegister) {
                          throw new Error('Acceso no autorizado: inicie sesión como Técnico o Administrador para radicar instrumentos.');
                        }

                        const tipoMapeado = formData.tipo.includes('Pesa')
                          ? 'Pesa'
                          : formData.tipo.includes('Dinamometro')
                          ? 'Dinamometro'
                          : 'Bascula';

                        // División de escala en la unidad de medida declarada
                        // Misma conversion que usa getNtc2031Validation (maxInGrams / eGram), para que
                        // el n que ve el usuario sea el que calcula el backend (incluye lb y g).
                        const divisionEscalaNormalizada = (parseFloat(formData.divisionEscala) || 5) / GRAMOS_POR_UNIDAD[formData.unidadMedida];

                        const payload: CreateInstrumentoPayload = {
                          serial: formData.serial.trim().toUpperCase(),
                          marca: formData.marca.trim(),
                          modelo: formData.modelo.trim(),
                          tipo: tipoMapeado as any,
                          categoriaExactitud: formData.categoriaExactitud,
                          capacidadMaxima: parseFloat(formData.capacidadMax) || 30,
                          capacidadMinima: parseFloat(formData.capacidadMin) || 0.1,
                          unidadMedida: formData.unidadMedida,
                          divisionEscala: divisionEscalaNormalizada,
                          codigoPrecintoSIMEL: formData.precintoSIMEL.trim().toUpperCase(),
                          evidenciasFotograficas: {
                            fotoEquipo: formData.fotoEquipo,
                            fotoPrecinto: formData.fotoPrecinto,
                            fotoUbicacion: formData.fotoUbicacion,
                          },
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

                        let registeredResult: any = null;

                        try {
                          registeredResult = await instrumentosService.create(payload);
                        } catch (apiErr: any) {
                          const status = apiErr?.status;
                          const message = apiErr?.message || '';

                          // ⚠️ Detección y alerta de duplicados en backend (HTTP 409 Conflict)
                          if (
                            status === 409 ||
                            message.toLowerCase().includes('ya existe') ||
                            message.toLowerCase().includes('conflict') ||
                            message.toLowerCase().includes('duplicate')
                          ) {
                            const duplicateMsg = message || `⚠️ Ya existe un instrumento registrado con el serial '${payload.serial}'.`;
                            setDuplicateSerialError(duplicateMsg);
                            setErrorMsg(duplicateMsg);
                            toast.error(`⚠️ ALERTA DE REGISTRO DUPLICADO: ${duplicateMsg}`, {
                              duration: 8000,
                              style: {
                                backgroundColor: '#FEF2F2',
                                border: '2px solid #DC2626',
                                color: '#991B1B',
                                fontWeight: 600,
                              },
                            });
                            setCurrentStep(1);
                            return;
                          }

                          // Sin conexion o error del servidor: NO se simula el registro. Se informa el fallo.
                          if (status === 0) {
                            throw new Error('Sin conexión con el servidor: el instrumento NO fue registrado. Verifique la red e intente de nuevo.');
                          }
                          throw apiErr;
                        }

                        confetti({
                          particleCount: 75,
                          spread: 60,
                          origin: { y: 0.6 },
                        });
                        toast.success(`Instrumento ${formData.serial} radicado exitosamente en el RUMP`);
                        setSuccessMsg(`¡Instrumento radicado con éxito en el RUMP bajo serial ${formData.serial}!`);

                        const successData: RegistrationSuccessData = {
                          id: registeredResult?.id || registeredResult?._id,
                          serial: payload.serial,
                          placaRump: registeredResult?.placaRump || `RUMP-CO-${Math.floor(100000 + Math.random() * 900000)}`,
                          marca: payload.marca,
                          modelo: payload.modelo,
                          tipo: payload.tipo,
                          categoriaExactitud: payload.categoriaExactitud,
                          capacidadMinima: payload.capacidadMinima ?? 0,
                          capacidadMaxima: payload.capacidadMaxima,
                          unidadMedida: payload.unidadMedida,
                          codigoPrecintoSIMEL: payload.codigoPrecintoSIMEL,
                          createdAt: registeredResult?.createdAt || new Date().toISOString(),
                          evidenciasFotograficas: payload.evidenciasFotograficas,
                        };
                        setSuccessModalData(successData);
                      } catch (err: any) {
                        const fieldErrors: Array<{ campo: string; mensaje: string }> = Array.isArray(err?.data?.fieldErrors)
                          ? err.data.fieldErrors
                          : [];
                        const mapped: Record<string, string> = {};
                        for (const fe of fieldErrors) {
                          if (fe?.campo && FIELD_INPUT_ID[fe.campo] && !mapped[fe.campo]) mapped[fe.campo] = fe.mensaje;
                        }
                        if (Object.keys(mapped).length > 0) {
                          setServerFieldErrors(mapped);
                          setCurrentStep(1);
                          setErrorMsg(`El servidor rechazó el registro: corrija los ${Object.keys(mapped).length} campo(s) marcados.`);
                          toast.error('Hay campos con errores. Revise los mensajes junto a cada campo.', { duration: 6000 });
                          const firstId = FIELD_INPUT_ID[Object.keys(mapped)[0]];
                          window.setTimeout(() => document.getElementById(firstId)?.focus(), 50);
                          return;
                        }
                        const message = err?.message || 'Error al radicar el instrumento en el backend';
                        toast.error(message, { duration: 6000 });
                        if (message.includes('Unauthorized') || message.includes('401') || message.includes('Forbidden') || message.includes('403')) {
                          setErrorMsg('Acceso no autorizado: Se requiere sesión activa de Técnico Metrólogo o Administrador.');
                        } else {
                          setErrorMsg(message);
                        }
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
                {isStep1Valid ? (
                  <span className="status-pill ok">PRE-APROBADO</span>
                ) : (
                  <span className="status-pill info">PENDIENTE DE DATOS</span>
                )}
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
                    <h2 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)', margin: '6px 0 2px 0' }}>
                      SICM-COL · VERIFICADO
                    </h2>
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
                    fontSize: '12px',
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
                    fontSize: '12px',
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

        {/* Modal de Confirmación y Consulta Inmediata (HU-01) */}
        <RegistrationSuccessModal
          isOpen={!!successModalData}
          data={successModalData}
          onConsultImmediately={(serial) => {
            setSuccessModalData(null);
            if (onConsultSerialImmediately) {
              onConsultSerialImmediately(serial);
            } else {
              onBackToAudit();
            }
          }}
          onGoToInventory={() => {
            setSuccessModalData(null);
            if (onRegisteredSuccess) {
              onRegisteredSuccess();
            } else {
              onBackToAudit();
            }
          }}
          onRegisterAnother={() => {
            setSuccessModalData(null);
            const newSerial = generateNewSerial();
            setFormData((prev) => ({
              ...prev,
              serial: newSerial,
              precintoSIMEL: `STAMP-CO-${Math.floor(1000000 + Math.random() * 9000000)}`,
            }));
            setCurrentStep(1);
            toast.success('Formulario preparado para registrar un nuevo instrumento.');
          }}
          onClose={() => {
            setSuccessModalData(null);
            if (onRegisteredSuccess) {
              onRegisteredSuccess();
            } else {
              onBackToAudit();
            }
          }}
        />
      </div>
    </div>
  );
};
