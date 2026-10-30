import React from 'react';
import { XIcon } from './Icons';
import { useDialogA11y } from '../../utils/useDialogA11y';

interface DialogShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Contenedor modal reutilizable (gestion de equipos HU-06..HU-09): foco atrapado, Esc cierra. */
export const DialogShell: React.FC<DialogShellProps> = ({
  title,
  subtitle,
  onClose,
  maxWidth = 860,
  children,
  footer,
}) => {
  const ref = useDialogA11y<HTMLDivElement>(true, onClose);

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 20, 39, 0.7)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            backgroundColor: 'var(--navy-900)',
            color: '#FFFFFF',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>{title}</div>
            {subtitle && (
              <div className="font-mono" style={{ fontSize: '12px', opacity: 0.85 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex' }}
          >
            <XIcon size={18} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              backgroundColor: '#F9FAFB',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
