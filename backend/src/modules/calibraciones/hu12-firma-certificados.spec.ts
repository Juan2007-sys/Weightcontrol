import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalibracionesService } from './calibraciones.service.js';
import { InstrumentosService } from '../instrumentos/instrumentos.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import {
  Calibracion,
  Instrumento,
  Certificado,
  Usuario,
  ResultadoCalibracion,
  RolUsuario,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';

describe('CalibracionesService — HU-12 Firma electrónica o digital de certificados', () => {
  let service: CalibracionesService;
  let mockCalibracionModel: any;
  let mockCertificadoModel: any;
  let mockUsuarioModel: any;
  let mockAuditService: any;

  let storedCalibracion: any;
  let storedCertificado: any;

  beforeEach(async () => {
    process.env.QR_SIGNING_SECRET = 'test-qr-signing-secret-hu12';

    storedCalibracion = {
      _id: '507f1f77bcf86cd799439011',
      instrumento: '507f1f77bcf86cd799439012',
      numeroCertificado: 'CERT-2026-HU12',
      codigoFolio: 'FOLIO-HU12-001',
      fechaCalibracion: new Date('2026-05-01T10:00:00.000Z'),
      fechaProximaCalibracion: new Date('2027-05-01T10:00:00.000Z'),
      resultado: ResultadoCalibracion.CONFORME,
      bloqueadoInmutable: false,
      anulado: false,
      toObject: function () {
        return { ...this };
      },
      save: vi.fn().mockImplementation(async function (this: any) {
        return this;
      }),
    };

    storedCertificado = {
      _id: '507f1f77bcf86cd799439013',
      codigoFolio: 'FOLIO-HU12-001',
      instrumento: '507f1f77bcf86cd799439012',
      calibracion: '507f1f77bcf86cd799439011',
      sellosAplicados: [],
      firmaDigital: undefined as any,
      save: vi.fn().mockImplementation(async function (this: any) {
        return this;
      }),
    };

    mockCalibracionModel = {
      findById: vi.fn().mockReturnValue({
        exec: vi.fn().mockImplementation(async () => storedCalibracion),
      }),
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockImplementation(async () => storedCalibracion),
      }),
    };
    // CalibracionesService.update uses findById directly without .exec()
    mockCalibracionModel.findById = vi
      .fn()
      .mockImplementation(() => {
        const promise: any = Promise.resolve(storedCalibracion);
        promise.exec = vi.fn().mockResolvedValue(storedCalibracion);
        return promise;
      });

    mockCertificadoModel = {
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockImplementation(async () => storedCertificado),
      }),
    };

    mockUsuarioModel = {
      findById: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: 'tec-1',
          nombre: 'Ing. María Metróloga',
          rol: RolUsuario.TECNICO,
        }),
      }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibracionesService,
        { provide: getModelToken(Calibracion.name), useValue: mockCalibracionModel },
        { provide: getModelToken(Instrumento.name), useValue: {} },
        { provide: InstrumentosService, useValue: {} },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PdfGeneratorService, useValue: {} },
        { provide: getModelToken(Certificado.name), useValue: mockCertificadoModel },
        { provide: getModelToken(Usuario.name), useValue: mockUsuarioModel },
      ],
    }).compile();

    service = module.get<CalibracionesService>(CalibracionesService);
  });

  it('CP-12.1 y CP-12.5: Técnico autorizado firma un certificado, registra fecha/firmante, sella inmutabilidad y audita', async () => {
    const res = await service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1');

    expect(res.firmado).toBe(true);
    expect(res.firmante).toBe('Ing. María Metróloga');
    expect(res.cargo).toBe(RolUsuario.TECNICO);
    expect(res.fechaFirma).toBeInstanceOf(Date);
    expect(res.hashFirma).toMatch(/^[a-f0-9]{64}$/);
    expect(res.bloqueadoInmutable).toBe(true);
    expect(storedCertificado.sellosAplicados).toContain('ConFirmaDigital');
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tec-1',
        actionType: TipoAccionAuditoria.GENERATE_CERT,
        entityAffected: EntidadAfectada.CERTIFICADO,
        identifier: 'CERT-2026-HU12',
      }),
    );
  });

  it('CP-12.3: Modificar un certificado ya firmado se bloquea (ForbiddenException) y conserva el original', async () => {
    await service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1');

    await expect(
      service.update(
        '507f1f77bcf86cd799439011',
        { observaciones: 'Intento de alterar certificado' },
        'tec-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no permite volver a firmar un certificado ya firmado', async () => {
    await service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1');

    await expect(
      service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('CP-12.4: Consultar el estado de la firma muestra si es válida, con firmante y fecha', async () => {
    const antes = await service.verificarFirma('507f1f77bcf86cd799439011');
    expect(antes.firmado).toBe(false);
    expect(antes.valida).toBe(false);

    await service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1');

    const despues = await service.verificarFirma('507f1f77bcf86cd799439011');
    expect(despues.firmado).toBe(true);
    expect(despues.valida).toBe(true);
    expect(despues.firmante).toBe('Ing. María Metróloga');
    expect(despues.fechaFirma).toBeInstanceOf(Date);
  });

  it('CP-12.3b: Si el registro fue alterado después de firmar, verificarFirma reporta valida=false', async () => {
    await service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1');
    storedCalibracion.resultado = ResultadoCalibracion.NO_CONFORME;

    const estado = await service.verificarFirma('507f1f77bcf86cd799439011');
    expect(estado.firmado).toBe(true);
    expect(estado.valida).toBe(false);
  });
});
