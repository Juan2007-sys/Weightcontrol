import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertasController } from './alertas.controller.js';
import { AlertasService } from './alertas.service.js';
import { NivelAlerta } from '../../schemas/alerta.schema.js';

describe('AlertasController', () => {
  let controller: AlertasController;
  let mockService: any;

  const mockAlerta = {
    id: '60d0fe4f5311236168a109cc',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ-5/10',
    fechaProximaCalibracion: new Date('2026-03-20'),
    diasRestantes: 4,
    nivelCriticidad: NivelAlerta.CRITICA,
    mensaje: 'Alerta crítica',
    canalesNotificados: ['SISTEMA', 'EMAIL'],
    leida: false,
    despachada: true,
  };

  const mockPaginated = {
    data: [mockAlerta],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  const mockStats = {
    total: 1,
    noLeidas: 1,
    porCriticidad: {
      preventivas: 0,
      moderadas: 0,
      criticas: 1,
      vencidas: 0,
    },
  };

  beforeEach(async () => {
    mockService = {
      findAll: vi.fn().mockResolvedValue(mockPaginated),
      getStats: vi.fn().mockResolvedValue(mockStats),
      scanAlertas: vi.fn().mockResolvedValue({
        totalEscaneados: 1,
        alertasGeneradas: 1,
        alertas: [mockAlerta],
      }),
      markAsRead: vi.fn().mockResolvedValue({ ...mockAlerta, leida: true }),
      markAllAsRead: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      dispatchAlerta: vi.fn().mockResolvedValue({ success: true, canales: ['SISTEMA', 'EMAIL'] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertasController],
      providers: [
        {
          provide: AlertasService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AlertasController>(AlertasController);
  });

  it('debe listar las alertas paginadas', async () => {
    const query = { page: 1, limit: 10 };
    const result = await controller.findAll(query);

    expect(result).toEqual(mockPaginated);
    expect(mockService.findAll).toHaveBeenCalledWith(query);
  });

  it('debe obtener las estadísticas de alertas', async () => {
    const result = await controller.getStats();

    expect(result).toEqual(mockStats);
    expect(mockService.getStats).toHaveBeenCalled();
  });

  it('debe disparar el escaneo manual de alertas', async () => {
    const result = await controller.scan('user_admin_123');

    expect(result.totalEscaneados).toBe(1);
    expect(result.alertasGeneradas).toBe(1);
    expect(mockService.scanAlertas).toHaveBeenCalledWith('user_admin_123');
  });

  it('debe marcar una alerta como leída', async () => {
    const result = await controller.markAsRead('60d0fe4f5311236168a109cc');

    expect(result.leida).toBe(true);
    expect(mockService.markAsRead).toHaveBeenCalledWith('60d0fe4f5311236168a109cc');
  });

  it('debe marcar todas las alertas como leídas', async () => {
    const result = await controller.markAllAsRead();

    expect(result.modifiedCount).toBe(1);
    expect(mockService.markAllAsRead).toHaveBeenCalled();
  });

  it('debe despachar manualmente una alerta a todos los canales', async () => {
    const result = await controller.dispatchAlerta('60d0fe4f5311236168a109cc');

    expect(result.success).toBe(true);
    expect(result.canales).toEqual(['SISTEMA', 'EMAIL']);
    expect(mockService.dispatchAlerta).toHaveBeenCalledWith('60d0fe4f5311236168a109cc');
  });
});
