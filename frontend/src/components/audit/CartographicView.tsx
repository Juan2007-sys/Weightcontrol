import React, { useState } from 'react';
import { MapPinIcon } from '../common/Icons';

interface RegionalNode {
  id: string;
  name: string;
  departamento: string;
  instrumentsCount: number;
  conformityRate: string;
  criticalAlerts: number;
  warningAlerts: number;
  status: 'OPTIMO' | 'ALERTA' | 'CRITICO';
  lat: string;
  lng: string;
}

const REGIONAL_NODES: RegionalNode[] = [
  {
    id: 'BOG-01',
    name: 'Nodo Técnico Metropolitano Bogotá',
    departamento: 'Bogotá D.C. & Cundinamarca',
    instrumentsCount: 7820,
    conformityRate: '93.8%',
    criticalAlerts: 12,
    warningAlerts: 184,
    status: 'ALERTA',
    lat: '4.7110° N',
    lng: '74.0721° W',
  },
  {
    id: 'MED-02',
    name: 'Nodo Técnico Valle de Aburrá',
    departamento: 'Antioquia & Eje Cafetero',
    instrumentsCount: 4150,
    conformityRate: '91.2%',
    criticalAlerts: 7,
    warningAlerts: 98,
    status: 'OPTIMO',
    lat: '6.2442° N',
    lng: '75.5812° W',
  },
  {
    id: 'CAL-03',
    name: 'Nodo Técnico Pacífico - Suroccidente',
    departamento: 'Valle del Cauca & Cauca',
    instrumentsCount: 3290,
    conformityRate: '88.9%',
    criticalAlerts: 6,
    warningAlerts: 72,
    status: 'CRITICO',
    lat: '3.4516° N',
    lng: '76.5320° W',
  },
  {
    id: 'BAR-04',
    name: 'Nodo Técnico Región Caribe',
    departamento: 'Atlántico, Bolívar & Magdalena',
    instrumentsCount: 2110,
    conformityRate: '95.1%',
    criticalAlerts: 2,
    warningAlerts: 34,
    status: 'OPTIMO',
    lat: '10.9685° N',
    lng: '74.7813° W',
  },
  {
    id: 'BUC-05',
    name: 'Nodo Técnico Nororiente & Frontera',
    departamento: 'Santander & Norte de Santander',
    instrumentsCount: 1050,
    conformityRate: '93.0%',
    criticalAlerts: 2,
    warningAlerts: 24,
    status: 'OPTIMO',
    lat: '7.1254° N',
    lng: '73.1198° W',
  },
];

export const CartographicView: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<RegionalNode>(REGIONAL_NODES[0]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '20px',
      }}
    >
      {/* Panel Izquierdo: Lista de Nodos Regionales de Fiscalización */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="microlabel" style={{ color: 'var(--navy-900)' }}>
              RED NACIONAL DE VIGILANCIA METROLÓGICA (SICM-COL)
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Cobertura georreferenciada de inspección metrológica legal
            </p>
          </div>
          <span className="status-pill ok">5 NODOS ACTIVOS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {REGIONAL_NODES.map((node) => {
            const isSelected = selectedNode.id === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-card)',
                  border: isSelected ? '1.5px solid var(--navy-900)' : '1px solid var(--border)',
                  backgroundColor: isSelected ? 'var(--blue-50)' : '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPinIcon size={16} style={{ color: isSelected ? 'var(--blue-600)' : 'var(--navy-900)' }} />
                    <span className="font-mono" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--navy-900)' }}>
                      NODO-{node.id}
                    </span>
                  </div>
                  <span className={`status-pill ${node.status === 'CRITICO' ? 'danger' : node.status === 'ALERTA' ? 'warn' : 'ok'}`}>
                    {node.status}
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {node.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {node.departamento} · Coordenadas: {node.lat}, {node.lng}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--border)',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Equipos:</span>{' '}
                    <strong className="font-mono">{node.instrumentsCount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Conformidad:</span>{' '}
                    <strong style={{ color: 'var(--ok)' }}>{node.conformityRate}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Críticos:</span>{' '}
                    <strong style={{ color: node.criticalAlerts > 0 ? 'var(--danger)' : 'var(--navy-900)' }}>
                      {node.criticalAlerts}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Derecho: Mapa / Radar de Telemetría Cartográfica */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          backgroundColor: '#071427',
          color: '#FFFFFF',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          minHeight: '380px',
        }}
      >
        {/* Cabecera del visor cartográfico */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
          <div>
            <div className="microlabel font-mono" style={{ color: '#38BDF8' }}>
              VISOR DE INTELIGENCIA DE FISCALIZACIÓN TERRITORIAL
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0 0', color: '#FFFFFF' }}>
              {selectedNode.name} (SICM-{selectedNode.id})
            </h3>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>
              Jurisdicción activa: {selectedNode.departamento}
            </p>
          </div>

          <div className="font-mono microlabel-sm" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
            RADAR GPS: {selectedNode.lat} | {selectedNode.lng}
          </div>
        </div>

        {/* Representación esquemática cartográfica con cuadrícula técnica */}
        <div
          style={{
            position: 'relative',
            height: '180px',
            margin: '20px 0',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            backgroundColor: 'rgba(11, 31, 63, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Rejilla de coordenadas de fondo */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Círculos concéntricos de radar de inspección */}
          <div
            style={{
              position: 'absolute',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: '1px dashed rgba(56, 189, 248, 0.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '1px solid rgba(56, 189, 248, 0.6)',
            }}
          />

          {/* Marcador central del nodo seleccionado */}
          <div
            style={{
              position: 'relative',
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: selectedNode.status === 'CRITICO' ? 'var(--danger)' : selectedNode.status === 'ALERTA' ? 'var(--warn)' : 'var(--ok)',
                border: '3px solid #FFFFFF',
                boxShadow: '0 0 15px rgba(255,255,255,0.6)',
              }}
              className="dot-pulse"
            />
            <span className="font-mono microlabel-sm" style={{ color: '#FFFFFF', marginTop: '6px', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '3px' }}>
              NODO-{selectedNode.id}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '10px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#94A3B8',
            }}
          >
            PROYECCIÓN CARTOGRÁFICA MAGNA-SIRGAS · COLOMBIA OFICIAL
          </div>
        </div>

        {/* Datos de telemetría del nodo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '14px',
            zIndex: 2,
          }}
        >
          <div>
            <div className="microlabel-sm" style={{ color: '#94A3B8' }}>CENSO RUMP EN ZONA</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
              {selectedNode.instrumentsCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="microlabel-sm" style={{ color: '#94A3B8' }}>CONFORMIDAD OIML</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: '#34D399', marginTop: '2px' }}>
              {selectedNode.conformityRate}
            </div>
          </div>
          <div>
            <div className="microlabel-sm" style={{ color: '#94A3B8' }}>MEDIDAS CAUTELARES</div>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 700, color: selectedNode.criticalAlerts > 0 ? '#F87171' : '#FFFFFF', marginTop: '2px' }}>
              {selectedNode.criticalAlerts} en curso
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
