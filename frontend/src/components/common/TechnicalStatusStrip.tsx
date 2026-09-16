import React, { useState, useEffect } from 'react';
import { LockIcon, ServerIcon } from './Icons';

export const TechnicalStatusStrip: React.FC = () => {
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Formato colombiano oficial con UTC-5
      const pad = (n: number) => n.toString().padStart(2, '0');
      const day = pad(now.getDate());
      const month = pad(now.getMonth() + 1);
      const year = now.getFullYear();
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      setCurrentTimestamp(`${day}/${month}/${year} ${hours}:${minutes}:${seconds} UTC-5`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      aria-label="Estado y telemetría de la infraestructura de metrología legal"
      style={{
        backgroundColor: '#F0F3F8',
        borderBottom: '1px solid var(--border)',
        borderTop: '1px solid var(--border)',
        padding: '6px 0',
        userSelect: 'none',
      }}
    >
      <div
        className="gov-container font-mono microlabel-sm"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          color: 'var(--text-primary)',
        }}
      >
        {/* Lado izquierdo: Cuadros de estado de los nodos y enlaces de fiscalización */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Nodo central */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--ok)',
                borderRadius: '1px',
              }}
              className="dot-pulse"
              aria-hidden="true"
            />
            <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
              SISTEMA INTEGRADO DE CONTROL METROLÓGICO (SICM-COL)
            </span>
          </div>

          <span aria-hidden="true" style={{ color: 'var(--border-strong)' }}>·</span>

          {/* Nodo técnico regional */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--blue-600)',
                borderRadius: '1px',
              }}
              aria-hidden="true"
            />
            <span>NODO TÉCNICO BOG-01</span>
          </div>

          <span aria-hidden="true" style={{ color: 'var(--border-strong)' }}>·</span>

          {/* Ambiente oficial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--navy-900)',
                borderRadius: '1px',
              }}
              aria-hidden="true"
            />
            <span>AMBIENTE PRODUCCIÓN OFICIAL</span>
          </div>

          <span aria-hidden="true" style={{ color: 'var(--border-strong)' }}>·</span>

          {/* Cifrado y seguridad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
            <LockIcon size={12} strokeWidth={2} />
            <span>SESIÓN CIFRADA SSL/TLS 1.3</span>
          </div>
        </div>

        {/* Lado derecho: Timestamp NIST UTC-5 en vivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy-900)' }}>
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              backgroundColor: 'var(--ok)',
              borderRadius: '1px',
            }}
            aria-hidden="true"
          />
          <span style={{ color: 'var(--text-muted)' }}>TIMESTAMPS NIST UTC-5:</span>
          <strong style={{ letterSpacing: '0.04em' }}>{currentTimestamp || '15/09/2026 01:05:00 UTC-5'}</strong>
        </div>
      </div>
    </section>
  );
};

