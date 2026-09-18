import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertasService } from '../src/modules/alertas/alertas.service.js';
import { NotificadorEngineService } from '../src/modules/alertas/notificador-engine.service.js';
import {
  NivelAlerta,
  EstadoInstrumento,
} from '../src/schemas/index.js';

describe('🟡 RF010 — Motor de Detección y Notificación de Alertas Metrológicas (OP-003 / R04)', () => {
  let alertasService: AlertasService;
  let notificadorEngine: NotificadorEngineService;
  let mockAlertaModel: any;
  let mockInstrumentoModel: any;
  let mockAuditService: any;
  let mockEmailStrategy: any;
  let mockSistemaStrategy: any;
  let mockAuditLogStrategy: any;

  beforeEach(() => {
    mockEmailStrategy = {
      getCanalName: vi.fn().mockReturnValue('EmailNotificadorStrategy'),
      sendNotification: vi.fn().mockResolvedValue(true),
    };
    mockSistemaStrategy = {
      getCanalName: vi.fn().mockReturnValue('SistemaNotificadorStrategy'),
      sendNotification: vi.fn().mockResolvedValue(true),
    };
    mockAuditLogStrategy = {
      getCanalName: vi.fn().mockReturnValue('AuditLogNotificadorStrategy'),
      sendNotification: vi.fn().mockResolvedValue(true),
    };

    notificadorEngine = new NotificadorEngineService(
      mockSistemaStrategy,
      mockEmailStrategy,
      mockAuditLogStrategy,
    );

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    mockAlertaModel = class {
      _id = 'alerta_123';
      save = vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      });
      toObject = vi.fn().mockImplementation(function (this: any) {
        return { ...this };
      });
      constructor(dto: any) {
        Object.assign(this, dto);
      }
      static findOne = vi.fn().mockResolvedValue(null);
      static find = vi.fn();
      static countDocuments = vi.fn();
      static aggregate = vi.fn();
    };

    mockInstrumentoModel = {
      find: vi.fn(),
    };

    alertasService = new AlertasService(
      mockAlertaModel as any,
      mockInstrumentoModel as any,
      notificadorEngine,
      mockAuditService,
    );
  });

  describe('Detección por Umbrales Temporales de Vencimiento', () => {
    it('TC-RF010-01: Alerta PREVENTIVA a 30 días de anticipación', async () => {
      const fechaEn30Dias = new Date();
      fechaEn30Dias.setDate(fechaEn30Dias.getDate() + 25);

      const instrumento = {
        _id: 'inst_30d',
        serial: 'BASC-30D',
        marca: 'Torrey',
        modelo: 'L-EQ',
        estado: EstadoInstrumento.VIGENTE,
        fechaProximaCalibracion: fechaEn30Dias,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInstrumentoModel.find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([instrumento]),
      });

      const result = await alertasService.scanAlertas();
      expect(result.alertasGeneradas).toBe(1);
      expect(result.alertas[0].nivelCriticidad).toBe(NivelAlerta.PREVENTIVA);
      expect(instrumento.estado).toBe(EstadoInstrumento.POR_VENCER);
    });

    it('TC-RF010-02: Alerta MODERADA a 15 días de anticipación', async () => {
      const fechaEn15Dias = new Date();
      fechaEn15Dias.setDate(fechaEn15Dias.getDate() + 12);

      const instrumento = {
        _id: 'inst_15d',
        serial: 'BASC-15D',
        marca: 'Torrey',
        modelo: 'L-EQ',
        estado: EstadoInstrumento.VIGENTE,
        fechaProximaCalibracion: fechaEn15Dias,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInstrumentoModel.find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([instrumento]),
      });

      const result = await alertasService.scanAlertas();
      expect(result.alertasGeneradas).toBe(1);
      expect(result.alertas[0].nivelCriticidad).toBe(NivelAlerta.MODERADA);
    });

    it('TC-RF010-03: Alerta CRÍTICA a 5 días de anticipación', async () => {
      const fechaEn3Dias = new Date();
      fechaEn3Dias.setDate(fechaEn3Dias.getDate() + 3);

      const instrumento = {
        _id: 'inst_3d',
        serial: 'BASC-3D',
        marca: 'Torrey',
        modelo: 'L-EQ',
        estado: EstadoInstrumento.POR_VENCER,
        fechaProximaCalibracion: fechaEn3Dias,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInstrumentoModel.find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([instrumento]),
      });

      const result = await alertasService.scanAlertas();
      expect(result.alertasGeneradas).toBe(1);
      expect(result.alertas[0].nivelCriticidad).toBe(NivelAlerta.CRITICA);
    });

    it('TC-RF010-04: Alerta VENCIDA para instrumento con fecha expirada (< 0 días)', async () => {
      const fechaExpirada = new Date();
      fechaExpirada.setDate(fechaExpirada.getDate() - 10);

      const instrumento = {
        _id: 'inst_vencido',
        serial: 'BASC-VENCIDA',
        marca: 'Torrey',
        modelo: 'L-EQ',
        estado: EstadoInstrumento.VIGENTE,
        fechaProximaCalibracion: fechaExpirada,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInstrumentoModel.find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([instrumento]),
      });

      const result = await alertasService.scanAlertas();
      expect(result.alertasGeneradas).toBe(1);
      expect(result.alertas[0].nivelCriticidad).toBe(NivelAlerta.VENCIDA);
      expect(instrumento.estado).toBe(EstadoInstrumento.VENCIDO);
    });

    it('TC-RF010-05: NO genera alertas si el instrumento fue calibrado y falta más de 30 días (Sin falsos positivos)', async () => {
      const fechaEn6Meses = new Date();
      fechaEn6Meses.setMonth(fechaEn6Meses.getMonth() + 6);

      const instrumento = {
        _id: 'inst_vigente',
        serial: 'BASC-OK',
        marca: 'Torrey',
        modelo: 'L-EQ',
        estado: EstadoInstrumento.VIGENTE,
        fechaProximaCalibracion: fechaEn6Meses,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInstrumentoModel.find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([instrumento]),
      });

      const result = await alertasService.scanAlertas();
      expect(result.alertasGeneradas).toBe(0);
      expect(instrumento.estado).toBe(EstadoInstrumento.VIGENTE);
    });
  });

  describe('Despacho Multicanal (Patrón Strategy GoF)', () => {
    it('TC-RF010-06: Despacho a través de canales activos configurados', async () => {
      const notificacion = {
        alertaId: 'alt_99',
        instrumentoId: 'inst_99',
        serial: 'BASC-99',
        marca: 'Torrey',
        modelo: 'L-EQ',
        fechaProximaCalibracion: new Date('2026-06-01'),
        diasRestantes: 2,
        nivelCriticidad: NivelAlerta.CRITICA,
        mensaje: 'Vencimiento en 2 días',
      };

      const canalesEjecutados = await notificadorEngine.dispatch(notificacion);
      expect(canalesEjecutados).toHaveLength(3);
      expect(mockEmailStrategy.sendNotification).toHaveBeenCalled();
      expect(mockSistemaStrategy.sendNotification).toHaveBeenCalled();
      expect(mockAuditLogStrategy.sendNotification).toHaveBeenCalled();
    });
  });
});
