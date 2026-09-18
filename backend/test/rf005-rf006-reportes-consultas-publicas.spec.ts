import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import {
  EstadoInstrumento,
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../src/schemas/instrumento.schema.js';

describe('🟡 RF005 & RF006 — Reportes de Conformidad y Consultas Públicas', () => {
  let instrumentosService: InstrumentosService;
  let mockInstrumentoModel: any;
  let mockValidationEngine: any;
  let mockAuditService: any;

  const mockDocs = [
    {
      _id: '60d0fe4f5311236168a10901',
      serial: 'BASC-PUB-01',
      marca: 'Torrey',
      modelo: 'L-EQ-10',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 30,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.005,
      estado: EstadoInstrumento.VIGENTE,
      fechaUltimaCalibracion: new Date('2026-01-01'),
      fechaProximaCalibracion: new Date('2027-01-01'),
      codigoPrecintoSIMEL: 'SIMEL-001',
      propietario: {
        nombreRazonSocial: 'Panadería Central',
        nitRut: '900111222',
        ciudad: 'Medellín',
      },
      toObject: function () {
        return { ...this };
      },
    },
    {
      _id: '60d0fe4f5311236168a10902',
      serial: 'PESA-PUB-02',
      marca: 'Mettler',
      modelo: 'M1',
      tipo: TipoInstrumento.PESA,
      categoriaExactitud: CategoriaExactitud.CLASE_II,
      capacidadMaxima: 20,
      unidadMedida: UnidadMedida.KG,
      estado: EstadoInstrumento.POR_VENCER,
      fechaUltimaCalibracion: new Date('2025-06-01'),
      fechaProximaCalibracion: new Date('2026-06-01'),
      toObject: function () {
        return { ...this };
      },
    },
  ];

  beforeEach(() => {
    mockInstrumentoModel = class {
      static find = vi.fn();
      static findOne = vi.fn();
      static countDocuments = vi.fn();
      static aggregate = vi.fn();
    };

    mockValidationEngine = {
      assertValid: vi.fn(),
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    instrumentosService = new InstrumentosService(
      mockInstrumentoModel as any,
      mockValidationEngine,
      mockAuditService,
    );
  });

  // ==========================================
  // RF005: REPORTES Y KPI METROLÓGICOS
  // ==========================================
  describe('RF005 — Generación de Reportes y Consistencia de Datos', () => {
    it('TC-RF005-01: Generar reporte estadístico y verificar consistencia matemática contra fuentes', async () => {
      mockInstrumentoModel.countDocuments.mockResolvedValue(100);
      mockInstrumentoModel.aggregate
        .mockResolvedValueOnce([
          { _id: EstadoInstrumento.VIGENTE, count: 70 },
          { _id: EstadoInstrumento.POR_VENCER, count: 20 },
          { _id: EstadoInstrumento.VENCIDO, count: 10 },
        ])
        .mockResolvedValueOnce([
          { _id: TipoInstrumento.BASCULA, count: 60 },
          { _id: TipoInstrumento.PESA, count: 25 },
          { _id: TipoInstrumento.DINAMOMETRO, count: 15 },
        ])
        .mockResolvedValueOnce([
          { _id: CategoriaExactitud.CLASE_I, count: 10 },
          { _id: CategoriaExactitud.CLASE_II, count: 20 },
          { _id: CategoriaExactitud.CLASE_III, count: 60 },
          { _id: CategoriaExactitud.CLASE_IIII, count: 10 },
        ]);

      const stats = await instrumentosService.getStats();

      expect(stats.total).toBe(100);
      expect(stats.porEstado.vigentes).toBe(70);
      expect(stats.porEstado.porVencer).toBe(20);
      expect(stats.porEstado.vencidos).toBe(10);
      expect(
        stats.porEstado.vigentes + stats.porEstado.porVencer + stats.porEstado.vencidos,
      ).toBe(stats.total);
    });

    it('TC-RF005-02: Reporte filtrado por tipo y estado', async () => {
      mockInstrumentoModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([mockDocs[0]]),
      });
      mockInstrumentoModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const report = await instrumentosService.findAll({
        tipo: TipoInstrumento.BASCULA,
        estado: EstadoInstrumento.VIGENTE,
      });

      expect(report.data).toHaveLength(1);
      expect(report.data[0].tipo).toBe(TipoInstrumento.BASCULA);
      expect(report.data[0].estado).toBe(EstadoInstrumento.VIGENTE);
      expect(report.meta.total).toBe(1);
    });

    it('TC-RF005-03: Reporte sin resultados (caso vacío) retorna array vacío con paginación limpia', async () => {
      mockInstrumentoModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });
      mockInstrumentoModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      const emptyReport = await instrumentosService.findAll({
        search: 'SERIAL_NON_EXISTENT_XYZ',
      });

      expect(emptyReport.data).toEqual([]);
      expect(emptyReport.meta.total).toBe(0);
      expect(emptyReport.meta.hasNextPage).toBe(false);
    });
  });

  // ==========================================
  // RF006: CONSULTAS PÚBLICAS CIUDADANAS
  // ==========================================
  describe('RF006 — Consultas Públicas y Protección de Datos Sensibles', () => {
    it('TC-RF006-01: Consulta pública por serial retorna información metrológica válida', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockDocs[0]),
        }),
      });

      const publicInfo = await instrumentosService.findBySerial('BASC-PUB-01');

      expect(publicInfo.serial).toBe('BASC-PUB-01');
      expect(publicInfo.marca).toBe('Torrey');
      expect(publicInfo.estado).toBe(EstadoInstrumento.VIGENTE);
      expect(publicInfo.codigoPrecintoSIMEL).toBe('SIMEL-001');
    });

    it('TC-RF006-02: La respuesta pública NO contiene campos sensibles o contraseñas', async () => {
      mockInstrumentoModel.findOne = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockDocs[0]),
        }),
      });

      const publicInfo = await instrumentosService.findBySerial('BASC-PUB-01');

      expect((publicInfo as any).password).toBeUndefined();
      expect((publicInfo as any).token).toBeUndefined();
      expect((publicInfo as any).secretKey).toBeUndefined();
      expect((publicInfo as any).__v).toBeUndefined();
    });
  });
});
