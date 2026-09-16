import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstrumentosController } from './instrumentos.controller.js';
import { InstrumentosService } from './instrumentos.service.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../../schemas/instrumento.schema.js';

describe('InstrumentosController', () => {
  let controller: InstrumentosController;
  let mockService: any;

  const mockInstrumento = {
    id: '60d0fe4f5311236168a109aa',
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ-5/10',
    tipo: TipoInstrumento.BASCULA,
    categoriaExactitud: CategoriaExactitud.CLASE_III,
    capacidadMaxima: 50,
    unidadMedida: UnidadMedida.KG,
    estado: EstadoInstrumento.VIGENTE,
    fechaUltimaCalibracion: new Date('2026-01-01'),
    fechaProximaCalibracion: new Date('2027-01-01'),
  };

  const mockPaginated = {
    data: [mockInstrumento],
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
    porEstado: { vigentes: 1, porVencer: 0, vencidos: 0 },
    porTipo: { basculas: 1, pesas: 0, dinamometros: 0 },
    porCategoriaExactitud: { claseI: 0, claseII: 0, claseIII: 1, claseIIII: 0 },
  };

  beforeEach(async () => {
    mockService = {
      create: vi.fn().mockResolvedValue(mockInstrumento),
      findAll: vi.fn().mockResolvedValue(mockPaginated),
      getStats: vi.fn().mockResolvedValue(mockStats),
      update: vi.fn().mockResolvedValue(mockInstrumento),
      delete: vi.fn().mockResolvedValue({ message: 'Eliminado', id: '60d0fe4f5311236168a109aa' }),
      findById: vi.fn().mockResolvedValue(mockInstrumento),
      findBySerial: vi.fn().mockResolvedValue(mockInstrumento),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstrumentosController],
      providers: [
        {
          provide: InstrumentosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InstrumentosController>(InstrumentosController);
  });

  it('debe registrar un nuevo instrumento', async () => {
    const createDto = {
      serial: 'BASC-001',
      marca: 'Torrey',
      modelo: 'L-EQ-5/10',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 50,
      unidadMedida: UnidadMedida.KG,
      fechaUltimaCalibracion: '2026-01-01T00:00:00.000Z',
      fechaProximaCalibracion: '2027-01-01T00:00:00.000Z',
    };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.create(createDto, 'user_123', req);

    expect(result).toEqual(mockInstrumento);
    expect(mockService.create).toHaveBeenCalledWith(createDto, 'user_123', '127.0.0.1', 'Vitest');
  });

  it('debe listar instrumentos con paginación y filtros', async () => {
    const query = { page: 1, limit: 10, search: 'Torrey' };
    const result = await controller.findAll(query);

    expect(result).toEqual(mockPaginated);
    expect(mockService.findAll).toHaveBeenCalledWith(query);
  });

  it('debe retornar estadísticas metrológicas consolidadas', async () => {
    const result = await controller.getStats();

    expect(result).toEqual(mockStats);
    expect(mockService.getStats).toHaveBeenCalled();
  });

  it('debe buscar públicamente por serial (publicSearch y findBySerial)', async () => {
    const pub = await controller.publicSearch('BASC-001');
    expect(pub).toEqual(mockInstrumento);
    expect(mockService.findBySerial).toHaveBeenCalledWith('BASC-001');

    const bySerial = await controller.findBySerial('BASC-001');
    expect(bySerial).toEqual(mockInstrumento);
  });

  it('debe actualizar un instrumento', async () => {
    const updateDto = { marca: 'Nueva Marca' };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.update('60d0fe4f5311236168a109aa', updateDto, 'user_123', req);

    expect(result).toEqual(mockInstrumento);
  });

  it('debe eliminar un instrumento', async () => {
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.delete('60d0fe4f5311236168a109aa', 'user_123', req);

    expect(result).toEqual({ message: 'Eliminado', id: '60d0fe4f5311236168a109aa' });
  });
});
