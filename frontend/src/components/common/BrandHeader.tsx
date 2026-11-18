import React, { useState } from 'react';
import type { ActiveScreen } from '../../types/metrology';
import { UserCheckIcon, ShieldCheckIcon } from './Icons';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface BrandHeaderProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ activeScreen, onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (screen: ActiveScreen) => {
    setMobileMenuOpen(false);
    // Verificación de RBAC en frontend para feedback inmediato
    if (screen === 'administracion') {
      if (user && !['ADMIN', 'AUDITOR', 'SIC'].includes(user.rol)) {
        toast.error(
          `🛑 Acceso Denegado (403): La Consola de Administración/Trazabilidad requiere rol ADMINISTRADOR, AUDITOR o SIC. Su rol actual es [${user.rol}].`
        );
        return;
      }
    }

    onNavigate(screen);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 auto' }}>
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
              Plataforma Oficial de Metrología Legal en Colombia | SIC
            </p>
          </div>
        </div>

        {/* Navegación Horizontal en Microlabel con Bloque Sólido Navy en Activo */}
        <nav
          className="header-desktop-nav"
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
            onClick={() => handleNavigate('auditoria')}
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
            onClick={() => handleNavigate('instrumentos')}
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
            onClick={() => handleNavigate('validaciones')}
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
            onClick={() => handleNavigate('administracion')}
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
            {user && user.rol !== 'ADMIN' ? 'Trazabilidad y Auditoría' : 'Administración del Sistema'}
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('consulta-publica')}
            className="microlabel"
            style={{
              height: '72px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: activeScreen === 'consulta-publica' ? 'var(--navy-900)' : 'transparent',
              color: activeScreen === 'consulta-publica' ? '#FFFFFF' : 'var(--blue-600)',
              fontWeight: 700,
              transition: 'background-color 0.15s ease',
              borderBottom: activeScreen === 'consulta-publica' ? '3px solid var(--blue-600)' : '3px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🔍 Consulta Pública (QR)</span>
          </button>
        </nav>

        {/* Perfil de Usuario con Rol / Acceso a Login (Desktop) */}
        <div className="header-desktop-user" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
                      color: user.rol === 'ADMIN' ? '#7C3AED' : user.rol === 'TECNICO' ? 'var(--blue-600)' : '#B45309',
                      fontWeight: 800,
                      marginTop: '1px',
                    }}
                  >
                    ROL: {user.rol}
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

        {/* Botón menú móvil (iPhone / Android / Tablet <= 1024px) */}
        <button
          type="button"
          className="header-mobile-toggle btn-gov-compact"
          aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          style={{
            height: '38px',
            minWidth: '42px',
            padding: '0 10px',
            fontSize: '18px',
            fontWeight: 700,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '72px',
            left: 0,
            right: 0,
            backgroundColor: 'var(--surface)',
            borderBottom: '2px solid var(--navy-900)',
            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.16)',
            zIndex: 50,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {[
            { id: 'auditoria' as ActiveScreen, label: 'Auditoría y Fiscalización' },
            { id: 'instrumentos' as ActiveScreen, label: 'Mis Instrumentos' },
            { id: 'validaciones' as ActiveScreen, label: 'Actas y Ensayos' },
            {
              id: 'administracion' as ActiveScreen,
              label: user && user.rol !== 'ADMIN' ? 'Trazabilidad y Auditoría' : 'Administración del Sistema',
            },
            { id: 'consulta-publica' as ActiveScreen, label: '🔍 Consulta Pública (QR)' },
          ].map((item) => {
            const isActive =
              activeScreen === item.id ||
              (item.id === 'instrumentos' && activeScreen === 'registro');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className="microlabel"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: isActive ? 'var(--navy-900)' : '#F8FAFC',
                  color: isActive ? '#FFFFFF' : 'var(--navy-900)',
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            );
          })}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-900)', textTransform: 'uppercase' }}>
                    {user.nombre}
                  </div>
                  <div className="font-mono" style={{ fontSize: '10px', color: 'var(--blue-600)', fontWeight: 700 }}>
                    ROL: {user.rol}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    onNavigate('login');
                  }}
                  className="btn-gov-compact"
                  style={{ height: '34px', fontSize: '11px', color: '#991B1B', borderColor: 'var(--danger)' }}
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('login');
                }}
                className="btn-gov-primary"
                style={{ width: '100%', height: '38px', fontSize: '12px' }}
              >
                <UserCheckIcon size={14} />
                <span>Ingreso Institucional</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
