import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalibracionesController } from './calibraciones.controller.js';
import { CalibracionesService } from './calibraciones.service.js';
import { ResultadoCalibracion } from '../../schemas/calibracion.schema.js';

describe('CalibracionesController', () => {
  let controller: CalibracionesController;
  let mockService: any;

  const mockCalibracion = {
    id: '60d0fe4f5311236168a109bb',
    instrumento: { id: 'inst_1', serial: 'BASC-001' },
    tecnico: { id: 'user_1', nombre: 'Carlos' },
    laboratorioAcreditado: 'Lab Metrológico',
    numeroCertificado: 'CERT-2026-001',
    fechaCalibracion: new Date('2026-02-01'),
    fechaProximaCalibracion: new Date('2027-02-01'),
    resultado: ResultadoCalibracion.CONFORME,
    patronesUtilizados: [],
    erroresMaximosPermitidos: [],
  };

  const mockPaginated = {
    data: [mockCalibracion],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    mockService = {
      create: vi.fn().mockResolvedValue(mockCalibracion),
      findAll: vi.fn().mockResolvedValue(mockPaginated),
      findById: vi.fn().mockResolvedValue(mockCalibracion),
      findByInstrumento: vi.fn().mockResolvedValue([mockCalibracion]),
      update: vi.fn().mockResolvedValue(mockCalibracion),
      delete: vi.fn().mockResolvedValue({ message: 'Eliminado', id: '60d0fe4f5311236168a109bb' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalibracionesController],
      providers: [
        {
          provide: CalibracionesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CalibracionesController>(CalibracionesController);
  });

  it('debe registrar un nuevo informe de calibración', async () => {
    const createDto = {
      instrumentoId: 'inst_1',
      laboratorioAcreditado: 'Lab Metrológico',
      numeroCertificado: 'CERT-2026-001',
      fechaCalibracion: '2026-02-01T00:00:00.000Z',
      fechaProximaCalibracion: '2027-02-01T00:00:00.000Z',
      resultado: ResultadoCalibracion.CONFORME,
    };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.create(createDto, 'user_1', req);

    expect(result).toEqual(mockCalibracion);
    expect(mockService.create).toHaveBeenCalledWith(createDto, 'user_1', '127.0.0.1', 'Vitest');
  });

  it('debe listar calibraciones con paginación', async () => {
    const query = { page: 1, limit: 10 };
    const result = await controller.findAll(query);

    expect(result).toEqual(mockPaginated);
    expect(mockService.findAll).toHaveBeenCalledWith(query);
  });

  it('debe consultar el historial de calibraciones de un instrumento', async () => {
    const result = await controller.findByInstrumento('inst_1');

    expect(result).toEqual([mockCalibracion]);
    expect(mockService.findByInstrumento).toHaveBeenCalledWith('inst_1');
  });

  it('debe actualizar una calibración', async () => {
    const updateDto = { laboratorioAcreditado: 'Nuevo Lab' };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.update('60d0fe4f5311236168a109bb', updateDto, 'user_1', req);

    expect(result).toEqual(mockCalibracion);
  });

  it('debe eliminar una calibración', async () => {
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.delete('60d0fe4f5311236168a109bb', 'user_1', req);

    expect(result).toEqual({ message: 'Eliminado', id: '60d0fe4f5311236168a109bb' });
  });
});
