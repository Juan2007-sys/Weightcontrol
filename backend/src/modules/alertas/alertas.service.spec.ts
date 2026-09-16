import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertasService } from './alertas.service.js';
import { NotificadorEngineService } from './notificador-engine.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  Alerta,
  Instrumento,
  NivelAlerta,
  EstadoInstrumento,
} from '../../schemas/index.js';

describe('AlertasService (HU-05 Motor de Alertas & Notificaciones)', () => {
  let service: AlertasService;
  let mockNotificadorEngine: any;
  let mockAuditService: any;

  const mockAlertaDoc = {
    _id: '60d0fe4f5311236168a109cc',
    instrumento: '60d0fe4f5311236168a109aa',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ-5/10',
    fechaProximaCalibracion: new Date('2026-03-20'),
    diasRestantes: 4,
    nivelCriticidad: NivelAlerta.CRITICA,
    mensaje: 'Alerta crítica de calibración',
    canalesNotificados: ['SISTEMA', 'EMAIL', 'AUDIT_LOG'],
    leida: false,
    despachada: true,
    toObject: vi.fn().mockImplementation(function (this: any) {
      return { ...this };
    }),
    save: vi.fn(),
  };

  const fechaProximaDentroDe4Dias = new Date();
  fechaProximaDentroDe4Dias.setDate(fechaProximaDentroDe4Dias.getDate() + 4);

  const mockInstrumentoDoc = {
    _id: '60d0fe4f5311236168a109aa',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ-5/10',
    estado: EstadoInstrumento.VIGENTE,
    fechaUltimaCalibracion: new Date('2025-03-20'),
    fechaProximaCalibracion: fechaProximaDentroDe4Dias,
    save: vi.fn().mockResolvedValue(true),
  };

  class MockAlertaModel {
    _id = '60d0fe4f5311236168a109cc';
    save = vi.fn().mockResolvedValue(this);
    toObject = vi.fn().mockReturnValue(mockAlertaDoc);
    constructor(dto: any) {
      Object.assign(this, dto);
      this._id = '60d0fe4f5311236168a109cc';
      this.save = vi.fn().mockResolvedValue(this);
      this.toObject = vi.fn().mockReturnValue({ ...this, _id: '60d0fe4f5311236168a109cc' });
    }
    static find = vi.fn();
    static findOne = vi.fn();
    static findById = vi.fn();
    static countDocuments = vi.fn();
    static aggregate = vi.fn();
    static updateMany = vi.fn();
  }

  class MockInstrumentoModel {
    static find = vi.fn();
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    MockAlertaModel.find = vi.fn();
    MockAlertaModel.findOne = vi.fn();
    MockAlertaModel.findById = vi.fn();
    MockAlertaModel.countDocuments = vi.fn();
    MockAlertaModel.aggregate = vi.fn();
    MockAlertaModel.updateMany = vi.fn();
    MockInstrumentoModel.find = vi.fn();

    mockNotificadorEngine = {
      dispatch: vi.fn().mockResolvedValue(['SISTEMA', 'EMAIL', 'AUDIT_LOG']),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertasService,
        {
          provide: getModelToken(Alerta.name),
          useValue: MockAlertaModel,
        },
        {
          provide: getModelToken(Instrumento.name),
          useValue: MockInstrumentoModel,
        },
        {
          provide: NotificadorEngineService,
          useValue: mockNotificadorEngine,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AlertasService>(AlertasService);
  });

  describe('scanAlertas', () => {
    it('debe detectar instrumentos próximos a vencer y despachar alertas a los canales', async () => {
      MockInstrumentoModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([mockInstrumentoDoc]),
      });
      MockAlertaModel.findOne.mockResolvedValue(null);

      const result = await service.scanAlertas('user_admin_123');

      expect(result.totalEscaneados).toBe(1);
      expect(result.alertasGeneradas).toBe(1);
      expect(mockNotificadorEngine.dispatch).toHaveBeenCalled();
      expect(mockInstrumentoDoc.estado).toBe(EstadoInstrumento.POR_VENCER);
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debe listar alertas paginadas', async () => {
      const queryMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([mockAlertaDoc]),
      };
      MockAlertaModel.find.mockReturnValue(queryMock);
      MockAlertaModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const query = { page: 1, limit: 10, nivelCriticidad: NivelAlerta.CRITICA };
      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].nivelCriticidad).toBe(NivelAlerta.CRITICA);
    });
  });

  describe('getStats', () => {
    it('debe retornar resumen de alertas', async () => {
      MockAlertaModel.countDocuments
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);
      MockAlertaModel.aggregate.mockResolvedValueOnce([
        { _id: NivelAlerta.CRITICA, count: 2 },
        { _id: NivelAlerta.MODERADA, count: 2 },
        { _id: NivelAlerta.PREVENTIVA, count: 1 },
      ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(5);
      expect(stats.noLeidas).toBe(3);
      expect(stats.porCriticidad.criticas).toBe(2);
      expect(stats.porCriticidad.moderadas).toBe(2);
      expect(stats.porCriticidad.preventivas).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('debe marcar una alerta como leída', async () => {
      const doc = {
        ...mockAlertaDoc,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      MockAlertaModel.findById.mockResolvedValue(doc);

      const result = await service.markAsRead('60d0fe4f5311236168a109cc');

      expect(result.leida).toBe(true);
    });

    it('debe lanzar NotFoundException si la alerta no existe', async () => {
      MockAlertaModel.findById.mockResolvedValue(null);

      await expect(service.markAsRead('no_existe')).rejects.toThrow(NotFoundException);
    });
  });
});
