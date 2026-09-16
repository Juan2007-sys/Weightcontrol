import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ActiveScreen, FilterCriteria, MetrologicalInstrument } from './types/metrology';
import { INITIAL_INSTRUMENTS } from './data/mockData';
import { instrumentosService } from './services/instrumentos.service';
import { GovBar } from './components/common/GovBar';
import { BrandHeader } from './components/common/BrandHeader';
import { TechnicalStatusStrip } from './components/common/TechnicalStatusStrip';
import { Breadcrumbs } from './components/common/Breadcrumbs';
import { TitleBlock } from './components/audit/TitleBlock';
import { KpiRow } from './components/audit/KpiRow';
import { ForensicFilters } from './components/audit/ForensicFilters';
import { DataTable } from './components/audit/DataTable';
import { LegalBanner } from './components/common/LegalBanner';
import { GovFooter } from './components/common/GovFooter';
import { RegisterInstrumentView } from './components/instruments/RegisterInstrumentView';
import { InstrumentsListView } from './components/instruments/InstrumentsListView';
import { AccreditationView } from './components/accreditation/AccreditationView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { LoginView } from './components/auth/LoginView';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_FILTERS: FilterCriteria = {
  busquedaGeneral: '',
  tipoIrregularidad: '',
  estadoLegal: '',
  oecAcreditado: '',
  jurisdiccion: '',
};

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('auditoria');
  const [instruments, setInstruments] = useState<MetrologicalInstrument[]>(INITIAL_INSTRUMENTS);
  const [filters, setFilters] = useState<FilterCriteria>(INITIAL_FILTERS);
  const [activeFilterQuery, setActiveFilterQuery] = useState<FilterCriteria>(INITIAL_FILTERS);

  const fetchInstruments = useCallback(async () => {
    try {
      const res = await instrumentosService.getAll({ limit: 100 });
      if (res.items && res.items.length > 0) {
        setInstruments(res.items);
      }
    } catch {
      // Fallback a mock data si el backend aún no tiene datos o está offline
    }
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const handleFilterChange = (field: keyof FilterCriteria, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setActiveFilterQuery(INITIAL_FILTERS);
    toast.info('Filtros forenses restablecidos.');
  };

  const handleApplyFilters = () => {
    setActiveFilterQuery({ ...filters });
    toast.success('Criterios de filtrado metrológico aplicados.');
  };

  // Filtrado reactivo de datos según criterios aplicados
  const filteredInstruments = useMemo(() => {
    return instruments.filter((item) => {
      // Búsqueda por serial, RUMP o NIT
      if (activeFilterQuery.busquedaGeneral.trim() !== '') {
        const query = activeFilterQuery.busquedaGeneral.toLowerCase();
        const matchesSerial = item.serial.toLowerCase().includes(query);
        const matchesRump = item.placaRump.toLowerCase().includes(query);
        const matchesNit = item.nit.toLowerCase().includes(query);
        const matchesEstablecimiento = item.establecimiento.toLowerCase().includes(query);
        if (!matchesSerial && !matchesRump && !matchesNit && !matchesEstablecimiento) {
          return false;
        }
      }

      // Filtro por irregularidad
      if (activeFilterQuery.tipoIrregularidad !== '') {
        if (activeFilterQuery.tipoIrregularidad === 'conforme' && !item.irregularidad.toLowerCase().includes('conforme')) {
          return false;
        }
        if (activeFilterQuery.tipoIrregularidad === 'emp' && !item.irregularidad.toLowerCase().includes('emp')) {
          return false;
        }
        if (activeFilterQuery.tipoIrregularidad === 'precinto' && !item.irregularidad.toLowerCase().includes('precinto')) {
          return false;
        }
        if (activeFilterQuery.tipoIrregularidad === 'vencido' && !item.irregularidad.toLowerCase().includes('vencid')) {
          return false;
        }
        if (activeFilterQuery.tipoIrregularidad === 'excentricidad' && !item.irregularidad.toLowerCase().includes('excentricidad')) {
          return false;
        }
      }

      // Filtro por estado legal
      if (activeFilterQuery.estadoLegal !== '') {
        if (item.estado !== activeFilterQuery.estadoLegal) {
          return false;
        }
      }

      // Filtro por jurisdicción / municipio
      if (activeFilterQuery.jurisdiccion !== '') {
        if (!item.municipio.includes(activeFilterQuery.jurisdiccion)) {
          return false;
        }
      }

      return true;
    });
  }, [instruments, activeFilterQuery]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-right" richColors theme="light" />

      {/* 1. Barra de Estado Gubernamental (--gov-bar, 28px) */}
      <GovBar />

      {/* 2. Cabecera de Marca Oficial (72px, blanco) */}
      <BrandHeader activeScreen={activeScreen} onNavigate={setActiveScreen} />

      {/* 3. Franja de Contexto Técnico (#F0F3F8, 1px border) */}
      <TechnicalStatusStrip />

      {/* Contenido Principal Modular con Animación */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            {activeScreen === 'auditoria' && (
              <>
                {/* 4. Breadcrumb Institucional con Chips OEC */}
                <Breadcrumbs
                  moduleName="INSPECCIÓN Y VIGILANCIA"
                  subSection="AUDITORÍA Y FISCALIZACIÓN NACIONAL DE INSTRUMENTOS"
                  oecCode="ONAC-18-LAB-042"
                  scopeExpiration="31/DIC/2026"
                  privilegeLevel="NIVEL L3 · AUDITOR DE VIGILANCIA SIC"
                />

                {/* 5. Bloque de Título H1 con Barra de 4px y Enlaces Normativos */}
                <TitleBlock
                  onExportReport={(format) => {
                    toast.success(`Generando Informe Forense Oficial (${format}) con trazabilidad NIST UTC-5 y hash SHA-256...`);
                  }}
                  onNewInspection={() => setActiveScreen('registro')}
                />

                {/* 6. Fila de 4 Tarjetas KPI con Borde Lateral Semántico */}
                <KpiRow />

                {/* 7. Panel de Filtro Forense Multicriterio de Metrología Legal */}
                <ForensicFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                  onApply={handleApplyFilters}
                />

                {/* 8. Tabla de Datos / Vista Cartográfica */}
                <DataTable instruments={filteredInstruments} />

                {/* 9. Banner Legal y Sancionatorio Ley 1480 de 2011 */}
                <LegalBanner />
              </>
            )}

            {activeScreen === 'registro' && (
              <>
                <Breadcrumbs
                  moduleName="MÓDULO TÉCNICO"
                  subSection="REGISTRAR NUEVO INSTRUMENTO METROLÓGICO (RUMP)"
                  oecCode="ONAC-18-LAB-042"
                  scopeExpiration="31/DIC/2026"
                  privilegeLevel="NIVEL L2 · TÉCNICO METRÓLOGO"
                />
                <RegisterInstrumentView
                  onBackToAudit={() => setActiveScreen('auditoria')}
                  onRegisteredSuccess={() => {
                    fetchInstruments();
                    toast.success('¡Instrumento metrológico registrado e inscrito en la base nacional!');
                    setActiveScreen('auditoria');
                  }}
                />
                <LegalBanner />
              </>
            )}

            {activeScreen === 'instrumentos' && (
              <>
                <Breadcrumbs
                  moduleName="MÓDULO TÉCNICO"
                  subSection="MIS INSTRUMENTOS REGISTRADOS"
                  oecCode="ONAC-18-LAB-042"
                  scopeExpiration="31/DIC/2026"
                  privilegeLevel="NIVEL L2 · TÉCNICO METRÓLOGO"
                />
                <InstrumentsListView
                  instruments={instruments}
                  onNewInstrument={() => setActiveScreen('registro')}
                />
                <LegalBanner />
              </>
            )}

            {activeScreen === 'validaciones' && (
              <>
                <Breadcrumbs
                  moduleName="ORGANISMOS ACREDITADOS"
                  subSection="VALIDACIONES PENDIENTES DE ACREDITACIÓN (ACTAS Y ENSAYOS)"
                  oecCode="ONAC-18-LAB-042"
                  scopeExpiration="31/DIC/2026"
                  privilegeLevel="NIVEL L3 · COMISIÓN TÉCNICA ONAC"
                />
                <AccreditationView />
                <LegalBanner />
              </>
            )}

            {activeScreen === 'administracion' && (
              <>
                <Breadcrumbs
                  moduleName="CONSOLA DE MANDO CENTRALIZADA"
                  subSection="ADMINISTRACIÓN DEL SISTEMA Y PARÁMETROS GLOBALES"
                  oecCode="ONAC-18-LAB-042"
                  scopeExpiration="31/DIC/2026"
                  privilegeLevel="NIVEL L4 · ADMINISTRADOR NACIONAL"
                />
                <AdminSettingsView />
                <LegalBanner />
              </>
            )}

            {activeScreen === 'login' && (
              <>
                <Breadcrumbs
                  moduleName="PORTAL DE ACCESO RESTRINGIDO"
                  subSection="ACCESO INSTITUCIONAL Y TÉCNICO"
                  oecCode="PUNTO SEGURO SICM"
                  scopeExpiration="VIGENTE"
                  privilegeLevel="AUTENTICACIÓN REQUERIDA (SICM-L1)"
                />
                <LoginView
                  onLoginSuccess={() => {
                    toast.success('Autenticación institucional exitosa. Bienvenido al SICM.');
                    setActiveScreen('auditoria');
                  }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Pie Institucional del Gobierno de Colombia y SIC */}
      <GovFooter />
    </div>
  );
};

export default App;
