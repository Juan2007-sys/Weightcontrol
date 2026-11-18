import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IndicadoresService } from './indicadores.service.js';
import {
  Instrumento,
  Calibracion,
  Certificado,
  EstadoInstrumento,
  EstadoCertificado,
} from '../../schemas/index.js';

describe('IndicadoresService — HU-15 Panel de indicadores y estadísticas', () => {
  let service: IndicadoresService;
  let mockInstrumentoModel: any;
  let mockCalibracionModel: any;
  let mockCertificadoModel: any;

  const sampleInstrumentos = [
    {
      _id: 'inst-1',
      tipo: 'BASCULA_COMERCIAL',
      estado: EstadoInstrumento.VIGENTE,
      activo: true,
    },
    {
      _id: 'inst-2',
      tipo: 'BASCULA_COMERCIAL',
      estado: EstadoInstrumento.POR_VENCER,
      activo: true,
    },
    {
      _id: 'inst-3',
      tipo: 'PESA_PATRON',
      estado: EstadoInstrumento.VENCIDO,
      activo: false,
    },
  ];

  const sampleCertificados = [
    { _id: 'cert-1', instrumento: 'inst-1', estado: EstadoCertificado.VALIDO },
    { _id: 'cert-2', instrumento: 'inst-3', estado: EstadoCertificado.ANULADO },
  ];

  beforeEach(async () => {
    mockInstrumentoModel = {
      find: vi.fn().mockImplementation((filter: any) => {
        const filtered = filter?.tipo
          ? sampleInstrumentos.filter((i) => i.tipo === filter.tipo)
          : sampleInstrumentos;
        return {
          lean: () => ({
            exec: vi.fn().mockResolvedValue(filtered),
          }),
        };
      }),
    };

    mockCalibracionModel = {
      countDocuments: vi.fn().mockImplementation((filter: any) => ({
        exec: vi.fn().mockResolvedValue(filter?.fechaCalibracion ? 1 : 4),
      })),
    };

    mockCertificadoModel = {
      find: vi.fn().mockImplementation((filter: any) => {
        const filtered = filter?.instrumento?.$in
          ? sampleCertificados.filter((c) =>
              filter.instrumento.$in.includes(c.instrumento),
            )
          : sampleCertificados;
        return {
          lean: () => ({
            exec: vi.fn().mockResolvedValue(filtered),
          }),
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        {
          provide: getModelToken(Instrumento.name),
          useValue: mockInstrumentoModel,
        },
        {
          provide: getModelToken(Calibracion.name),
          useValue: mockCalibracionModel,
        },
        {
          provide: getModelToken(Certificado.name),
          useValue: mockCertificadoModel,
        },
      ],
    }).compile();

    service = module.get<IndicadoresService>(IndicadoresService);
  });

  it('CP-15.1: muestra totales de equipos, activos/inactivos, calibraciones y certificados', async () => {
    const res = await service.getPanelIndicadores({});

    expect(res.equipos.total).toBe(3);
    expect(res.equipos.activos).toBe(2);
    expect(res.equipos.inactivos).toBe(1);
    expect(res.equipos.porEstado).toEqual({
      Vigente: 1,
      'Por vencer': 1,
      Vencido: 1,
    });
    expect(res.calibraciones).toEqual({
      realizadas: 4,
      pendientes: 1,
      vencidas: 1,
    });
    expect(res.certificados).toEqual({
      emitidos: 2,
      vigentes: 1,
      anulados: 1,
    });
  });

  it('CP-15.2: filtra los indicadores por rango de fechas', async () => {
    const res = await service.getPanelIndicadores({
      fechaInicio: '2026-01-01',
      fechaFin: '2026-06-30',
    });

    expect(res.calibraciones.realizadas).toBe(1);
    expect(res.filtrosAplicados).toEqual({
      fechaInicio: '2026-01-01',
      fechaFin: '2026-06-30',
      tipoEquipo: null,
    });
  });

  it('CP-15.3: consulta estadísticas filtradas por tipo de equipo', async () => {
    const res = await service.getPanelIndicadores({
      tipoEquipo: 'BASCULA_COMERCIAL',
    });

    expect(res.equipos.total).toBe(2);
    expect(res.equipos.porTipo).toEqual([
      { tipo: 'BASCULA_COMERCIAL', cantidad: 2 },
    ]);
    expect(res.certificados.emitidos).toBe(1);
  });
});
