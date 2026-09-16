import React, { useState } from 'react';
import { LockIcon, ShieldCheckIcon, AlertTriangleIcon, CheckIcon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [profile, setProfile] = useState('inspector');
  const [email, setEmail] = useState('admin@weightcontrol.gov.co');
  const [password, setPassword] = useState('Admin123456!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleProfileChange = (newProfile: string) => {
    setProfile(newProfile);
    if (newProfile === 'admin') {
      setEmail('admin@weightcontrol.gov.co');
      setPassword('Admin123456!');
    } else if (newProfile === 'tecnico') {
      setEmail('tecnico@oec-onac.org');
      setPassword('Tecnico123456!');
    } else if (newProfile === 'inspector') {
      setEmail('inspector@sic.gov.co');
      setPassword('Inspector123456!');
    } else if (newProfile === 'oec') {
      setEmail('laboratorio@onac.org.co');
      setPassword('Laboratorio123456!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err?.message || 'Error al autenticar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 0 40px 0' }}>
      <div className="gov-container">
        {/* Encabezado del Punto de Acceso */}
        <div
          style={{
            borderLeft: '4px solid var(--navy-900)',
            paddingLeft: '18px',
            marginBottom: '28px',
          }}
        >
          <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
            PORTAL DE ACCESO RESTRINGIDO · CONTROL METROLÓGICO LEGAL (SICM-COL)
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
            Acceso Institucional y Técnico
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Autenticación segura para autoridades de control, organismos de inspección acreditados y técnicos certificadores.
          </p>
        </div>

        {/* Layout a 2 Columnas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Columna Izquierda: Tarjeta de Destinatarios + Bloque Negro de Protocolo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tarjeta de Destinatarios */}
            <div className="gov-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                DESTINATARIOS AUTORIZADOS DEL PUNTO DE ACCESO
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ color: 'var(--blue-600)', marginTop: '2px' }}>
                    <ShieldCheckIcon size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--navy-900)' }}>
                      Inspectores de Vigilancia y Fiscalización de la SIC
                    </strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Facultades de instrucción sancionatoria, sellamiento y decomiso preventivo.
                    </p>
                  </div>
                </li>

                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ color: 'var(--blue-600)', marginTop: '2px' }}>
                    <ShieldCheckIcon size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--navy-900)' }}>
                      Organismos Evaluadores de la Conformidad (OEC)
                    </strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Laboratorios acreditados por ONAC bajo norma NTC-ISO/IEC 17020 y NTC 2031.
                    </p>
                  </div>
                </li>

                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ color: 'var(--blue-600)', marginTop: '2px' }}>
                    <ShieldCheckIcon size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--navy-900)' }}>
                      Técnicos Metrólogos y Custodios del RUMP
                    </strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Inscripción y gestión del censo nacional de pesas y balanzas comerciales.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Bloque Negro: Protocolo de Verificación Obligatoria con Checks */}
            <div
              style={{
                backgroundColor: 'var(--gov-bar)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-card)',
                padding: '24px',
                border: '1px solid #1E293B',
              }}
            >
              <div
                className="microlabel font-mono"
                style={{
                  color: '#38BDF8',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  paddingBottom: '8px',
                  marginBottom: '16px',
                }}
              >
                PROTOCOLO DE VERIFICACIÓN OBLIGATORIA (SEGURIDAD SICM)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--ok)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon size={13} strokeWidth={2.5} />
                  </div>
                  <span>Firma digital mediante Módulo Criptográfico HSM FIPS 140-2</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--ok)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon size={13} strokeWidth={2.5} />
                  </div>
                  <span>Consulta de acreditación vigente en tiempo real ante ONAC</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--ok)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon size={13} strokeWidth={2.5} />
                  </div>
                  <span>Pistas de auditoría inmutables certificadas (ISO/IEC 27001)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--ok)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon size={13} strokeWidth={2.5} />
                  </div>
                  <span>Estampado de tiempo trazable a patrón de frecuencia NIST UTC-5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario Técnico + Banner Legal Ámbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="gov-card" style={{ padding: '28px', backgroundColor: '#FFFFFF' }}>
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                CREDENCIALES DE AUTENTICACIÓN INSTITUCIONAL
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {error && (
                  <div
                    style={{
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
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-profile" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    PERFIL INSTITUCIONAL O REGULATORIO
                  </label>
                  <select
                    id="auth-profile"
                    value={profile}
                    onChange={(e) => handleProfileChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border-strong)',
                    }}
                  >
                    <option value="inspector">Auditor / Inspector de Vigilancia SIC</option>
                    <option value="oec">Organismo Evaluador de la Conformidad (OEC-ONAC)</option>
                    <option value="tecnico">Técnico Metrólogo Certificado (RUMP)</option>
                    <option value="admin">Administrador Central del Sistema</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="auth-email" className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    CORREO ELECTRÓNICO INSTITUCIONAL ACREDITADO
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border-strong)',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="auth-password" className="microlabel" style={{ color: 'var(--text-muted)' }}>
                      CONTRASEÑA TÉCNICA (MÍN. 8 CARACTERES)
                    </label>
                    <span className="microlabel-sm font-mono" style={{ color: 'var(--ok)' }}>
                      NIVEL ALTO
                    </span>
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border-strong)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gov-primary"
                  style={{ width: '100%', height: '42px', marginTop: '8px', opacity: submitting ? 0.7 : 1 }}
                >
                  <LockIcon size={16} />
                  <span>{submitting ? 'Autenticando...' : 'Validar Credencial e Ingresar a SICM-COL'}</span>
                </button>
              </form>
            </div>

            {/* Banner Legal Ámbar Rematando la Columna */}
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid rgba(217, 119, 6, 0.4)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: '#78350F',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ color: 'var(--warn)', flexShrink: 0, marginTop: '2px' }}>
                <AlertTriangleIcon size={18} strokeWidth={2} />
              </div>
              <div>
                <strong style={{ textTransform: 'uppercase', color: '#92400E', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  ACCESO MONITOREADO BAJO LEY 1273 DE 2009 (DELITOS INFORMÁTICOS)
                </strong>
                El acceso no autorizado a este sistema gubernamental de fiscalización o el uso ilegítimo de credenciales constituye delito federal castigado con pena de prisión de 48 a 96 meses. Toda transacción queda registrada en bitácora inmutable.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

