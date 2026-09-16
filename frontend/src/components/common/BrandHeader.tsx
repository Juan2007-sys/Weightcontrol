import React from 'react';
import type { ActiveScreen } from '../../types/metrology';
import { UserCheckIcon, ShieldCheckIcon } from './Icons';
import { useAuth } from '../../context/AuthContext';

interface BrandHeaderProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ activeScreen, onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <header
      style={{
        backgroundColor: 'var(--surface)',
        height: '72px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        className="gov-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
          gap: '24px',
        }}
      >
        {/* Marca Institucional SIC & WeightControl */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Isotipo Circular Oficial */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--navy-900)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              position: 'relative',
            }}
            title="Escudo de Metrología Legal · Superintendencia de Industria y Comercio"
          >
            <ShieldCheckIcon size={22} strokeWidth={1.75} />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: 'var(--ok)',
                border: '2px solid #FFFFFF',
              }}
              title="Nodo Criptográfico Conectado"
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--navy-900)',
                  lineHeight: 1.1,
                }}
              >
                WeightControl
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--blue-600)',
                  backgroundColor: 'var(--blue-50)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                }}
              >
                v4.12.8-STABLE
              </span>
            </div>
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.3,
                marginTop: '1px',
              }}
            >
              Plataforma Oficial de Consulta de Metrología Legal en Colombia | SIC
            </p>
          </div>
        </div>

        {/* Navegación Horizontal en Microlabel con Bloque Sólido Navy en Activo */}
        <nav
          aria-label="Navegación del Sistema Metrológico"
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('auditoria')}
            className="microlabel"
            style={{
              height: '72px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeScreen === 'auditoria' ? 'var(--navy-900)' : 'transparent',
              color: activeScreen === 'auditoria' ? '#FFFFFF' : 'var(--text-primary)',
              transition: 'background-color 0.15s ease',
              borderBottom: activeScreen === 'auditoria' ? '3px solid var(--blue-600)' : '3px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            Auditoría y Fiscalización
          </button>

          <button
            type="button"
            onClick={() => onNavigate('instrumentos')}
            className="microlabel"
            style={{
              height: '72px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeScreen === 'instrumentos' || activeScreen === 'registro' ? 'var(--navy-900)' : 'transparent',
              color: activeScreen === 'instrumentos' || activeScreen === 'registro' ? '#FFFFFF' : 'var(--text-primary)',
              transition: 'background-color 0.15s ease',
              borderBottom: activeScreen === 'instrumentos' || activeScreen === 'registro' ? '3px solid var(--blue-600)' : '3px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            Mis Instrumentos
          </button>

          <button
            type="button"
            onClick={() => onNavigate('validaciones')}
            className="microlabel"
            style={{
              height: '72px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeScreen === 'validaciones' ? 'var(--navy-900)' : 'transparent',
              color: activeScreen === 'validaciones' ? '#FFFFFF' : 'var(--text-primary)',
              transition: 'background-color 0.15s ease',
              borderBottom: activeScreen === 'validaciones' ? '3px solid var(--blue-600)' : '3px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            Actas y Ensayos
          </button>

          <button
            type="button"
            onClick={() => onNavigate('administracion')}
            className="microlabel"
            style={{
              height: '72px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: activeScreen === 'administracion' ? 'var(--navy-900)' : 'transparent',
              color: activeScreen === 'administracion' ? '#FFFFFF' : 'var(--text-primary)',
              transition: 'background-color 0.15s ease',
              borderBottom: activeScreen === 'administracion' ? '3px solid var(--blue-600)' : '3px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            Administración del Sistema
          </button>
        </nav>

        {/* Perfil de Usuario con Rol / Acceso a Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--navy-900)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheckIcon size={16} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--navy-900)',
                      lineHeight: 1.2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {user.nombre}
                  </div>
                  <div
                    className="microlabel-sm font-mono"
                    style={{
                      fontSize: '9px',
                      color: 'var(--blue-600)',
                      marginTop: '1px',
                    }}
                  >
                    ROL: {user.rol} {user.cargo ? `· ${user.cargo}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  onNavigate('login');
                }}
                className="btn-gov-compact"
                style={{ height: '34px', fontSize: '11px', color: '#991B1B', borderColor: 'var(--danger)' }}
                title="Cerrar sesión y salir del sistema"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="btn-gov-primary"
              style={{ height: '36px', fontSize: '12px', padding: '0 14px' }}
            >
              <UserCheckIcon size={14} />
              <span>Ingreso Institucional</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

