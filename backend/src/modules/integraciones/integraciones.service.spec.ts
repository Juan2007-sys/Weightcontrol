import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegracionesService } from './integraciones.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  ConexionExterna,
  SyncLog,
  EstadoSincronizacion,
  Instrumento,
  TipoInstrumento,
  CategoriaExactitud,
} from '../../schemas/index.js';

describe('IntegracionesService — HU-16 Integración con sistemas externos', () => {
  let service: IntegracionesService;
  let mockConexionModel: any;
  let mockSyncLogModel: any;
  let mockInstrumentoModel: any;
  let mockAuditService: any;

  let storedConexiones: any[];
  let storedLogs: any[];
  let storedInstrumentos: any[];

  beforeEach(async () => {
    storedConexiones = [];
    storedLogs = [];
    storedInstrumentos = [];

    mockConexionModel = vi.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        _id: `conn-${storedConexiones.length + 1}`,
        save: vi.fn().mockImplementation(async function (this: any) {
          storedConexiones.push(this);
          return this;
        }),
      };
    });
    mockConexionModel.findOne = vi.fn().mockImplementation((filter: any) => {
      const match = storedConexiones.find(
        (c) =>
          c.codigoSistema === filter.codigoSistema &&
          (filter.activo === undefined || c.activo === filter.activo),
      );
      const result: any = Promise.resolve(match || null);
      result.exec = vi.fn().mockResolvedValue(match || null);
      result.select = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(match || null),
      });
      result.lean = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(match || null),
      });
      return result;
    });

    mockSyncLogModel = vi.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        _id: `log-${storedLogs.length + 1}`,
        save: vi.fn().mockImplementation(async function (this: any) {
          storedLogs.unshift(this);
          return this;
        }),
      };
    });
    mockSyncLogModel.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnValue({
        exec: vi.fn().mockImplementation(async () => storedLogs),
      }),
    });

    mockInstrumentoModel = vi.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        _id: `inst-${storedInstrumentos.length + 1}`,
        save: vi.fn().mockImplementation(async function (this: any) {
          storedInstrumentos.push(this);
          return this;
        }),
      };
    });
    mockInstrumentoModel.findOne = vi.fn().mockImplementation((filter: any) => ({
      lean: () => ({
        exec: vi.fn().mockImplementation(async () => {
          return (
            storedInstrumentos.find((i) => i.serial === filter.serial) || null
          );
        }),
      }),
    }));

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracionesService,
        {
          provide: getModelToken(ConexionExterna.name),
          useValue: mockConexionModel,
        },
        { provide: getModelToken(SyncLog.name), useValue: mockSyncLogModel },
        {
          provide: getModelToken(Instrumento.name),
          useValue: mockInstrumentoModel,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<IntegracionesService>(IntegracionesService);
  });

  it('CP-16.1: Administrador configura conexión externa y recibe API Key', async () => {
    const res = await service.crearConexion(
      {
        nombre: 'ERP Metrología',
        codigoSistema: 'ERP_EXT',
        endpointUrl: 'https://erp.ejemplo.co/api/webhook',
      },
      'admin-1',
    );

    expect(res.codigoSistema).toBe('ERP_EXT');
    expect(res.apiKey).toMatch(/^wc_live_/);
    expect(res.activo).toBe(true);
    expect(mockAuditService.logEvent).toHaveBeenCalled();
  });

  it('CP-16.2 y CP-16.5: Sincroniza equipo válido, registra solicitud/respuesta y evita duplicados', async () => {
    const conn = await service.crearConexion(
      {
        nombre: 'SIMEL Externo',
        codigoSistema: 'SIMEL_API',
        endpointUrl: 'https://simel.ejemplo.co/hook',
      },
      'admin-1',
    );

    const payload = {
      serial: 'EXT-900',
      marca: 'Mettler',
      modelo: 'IND570',
      tipo: TipoInstrumento.BASCULA_COMERCIAL,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 150,
      fechaUltimaCalibracion: '2026-05-01',
      fechaProximaCalibracion: '2027-05-01',
    };

    const primero = await service.sincronizarEquipo(
      'SIMEL_API',
      conn.apiKey,
      payload,
    );
    expect(primero.estado).toBe('SINCRONIZADO');
    expect(primero.duplicado).toBe(false);
    expect(storedInstrumentos).toHaveLength(1);

    // Segundo envío del mismo serial no genera duplicado
    const segundo = await service.sincronizarEquipo(
      'SIMEL_API',
      conn.apiKey,
      payload,
    );
    expect(segundo.estado).toBe('OMITIDO_DUPLICADO');
    expect(segundo.duplicado).toBe(true);
    expect(storedInstrumentos).toHaveLength(1);

    const historial = await service.getHistorialSincronizaciones();
    expect(historial).toHaveLength(2);
    expect(historial[0].estado).toBe(EstadoSincronizacion.DUPLICADO);
    expect(historial[1].estado).toBe(EstadoSincronizacion.EXITOSO);
  });

  it('CP-16.4: Rechaza solicitud sin autenticación (401) o conexión inactiva (403)', async () => {
    await expect(
      service.sincronizarEquipo(undefined, undefined, {} as any),
    ).rejects.toThrow(UnauthorizedException);

    const conn = await service.crearConexion(
      {
        nombre: 'Sistema Inactivo',
        codigoSistema: 'INACTIVO',
        endpointUrl: 'https://inactivo.ejemplo.co',
        activo: false,
      },
      'admin-1',
    );

    await expect(
      service.sincronizarEquipo('INACTIVO', conn.apiKey, {} as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('CP-16.6: Falla de comunicación saliente registra ERROR_COMUNICACION en el historial', async () => {
    await service.crearConexion(
      {
        nombre: 'Destino Caído',
        codigoSistema: 'ERP_DOWN',
        endpointUrl: 'http://127.0.0.1:59999/unreachable',
      },
      'admin-1',
    );

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await service.enviarASistemaExterno('ERP_DOWN', {
      serial: 'EXT-900',
    });

    expect(res.ok).toBe(false);
    expect(res.codigoHttp).toBe(502);
    const historial = await service.getHistorialSincronizaciones();
    expect(historial[0].estado).toBe(EstadoSincronizacion.ERROR_COMUNICACION);
    expect(historial[0].errorMensaje).toContain('ECONNREFUSED');

    fetchSpy.mockRestore();
  });
});
