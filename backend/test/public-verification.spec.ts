import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../src/schemas/instrumento.schema.js';

describe('HU-05: Consulta Pública, Verificación Metrológica y Privacidad (Habeas Data)', () => {
  let service: InstrumentosService;
  let mockInstrumentoModel: any;
  let mockValidationEngine: any;
  let mockAuditService: any;

  const mockDbInstrumento = {
    _id: '60d0fe4f5311236168a109aa',
    serial: 'BAL-2026-BOG-991',
    marca: 'Torrey',
    modelo: 'L-EQ-10/20',
    tipo: TipoInstrumento.BASCULA,
    categoriaExactitud: CategoriaExactitud.CLASE_III,
    capacidadMaxima: 30,
    capacidadMinima: 0.1,
    unidadMedida: UnidadMedida.KG,
    divisionEscala: 0.005,
    numeroDivisionesVerificacion: 6000,
    codigoPrecintoSIMEL: 'STAMP-COL-8821',
    estado: EstadoInstrumento.VIGENTE,
    fechaUltimaCalibracion: new Date('2026-01-15T00:00:00.000Z'),
    fechaProximaCalibracion: new Date('2027-01-15T00:00:00.000Z'),
    // Datos privados y sensibles que NUNCA deben exponerse públicamente
    propietario: {
      nombreRazonSocial: 'COMERCIALIZADORA PRIVADA SAS',
      nitRut: '900.887.654-1',
      direccion: 'Carrera 7 # 120-40 Piso 5',
      ciudad: 'Bogotá D.C.',
      departamento: 'Cundinamarca',
      telefono: '3101234567',
      emailContacto: 'contabilidad@comercializadoraprivada.com',
    },
    ubicacionFisica: 'Bodega Central de Despachos Privada',
    creadoPor: '60d0fe4f5311236168a10901',
    actualizadoPor: '60d0fe4f5311236168a10902',
    createdAt: new Date('2026-01-15T08:30:00.000Z'),
    updatedAt: new Date('2026-01-15T09:00:00.000Z'),
  };

  beforeEach(() => {
    mockInstrumentoModel = {
      findOne: vi.fn(),
    };

    mockValidationEngine = {
      assertValid: vi.fn(),
      validate: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    service = new InstrumentosService(
      mockInstrumentoModel as any,
      mockValidationEngine as any,
      mockAuditService as any,
    );
  });

  describe('Criterio 1 & 2: Información Metrológica Expuesta Sanitizada', () => {
    it('debe exponer únicamente los campos metrológicos y de vigencia requeridos', async () => {
      mockInstrumentoModel.findOne.mockResolvedValue(mockDbInstrumento);

      const result = await service.verifyPublic('BAL-2026-BOG-991');

      // Campos metrológicos verificados
      expect(result.serial).toBe('BAL-2026-BOG-991');
      expect(result.marca).toBe('Torrey');
      expect(result.modelo).toBe('L-EQ-10/20');
      expect(result.tipo).toBe(TipoInstrumento.BASCULA);
      expect(result.categoriaExactitud).toBe(CategoriaExactitud.CLASE_III);
      expect(result.capacidadMaxima).toBe(30);
      expect(result.capacidadMinima).toBe(0.1);
      expect(result.unidadMedida).toBe(UnidadMedida.KG);
      expect(result.divisionEscala).toBe(0.005);
      expect(result.codigoPrecintoSIMEL).toBe('STAMP-COL-8821');
      expect(result.estadoMetrologico).toBe(EstadoInstrumento.VIGENTE);
      expect(result.esVigente).toBe(true);
      expect(result.mensajeVerificacion).toContain('RUMP');
    });

    it('Criterio 4 (Habeas Data): NO debe exponer datos de propietario, NIT, cédula, dirección ni usuarios creadores', async () => {
      mockInstrumentoModel.findOne.mockResolvedValue(mockDbInstrumento);

      const result = await service.verifyPublic('BAL-2026-BOG-991') as any;

      // Verificación estricta de no-fuga de datos
      expect(result.propietario).toBeUndefined();
      expect(result.nombreRazonSocial).toBeUndefined();
      expect(result.nitRut).toBeUndefined();
      expect(result.nit).toBeUndefined();
      expect(result.direccion).toBeUndefined();
      expect(result.telefono).toBeUndefined();
      expect(result.emailContacto).toBeUndefined();
      expect(result.creadoPor).toBeUndefined();
      expect(result.actualizadoPor).toBeUndefined();
      expect(result.ubicacionFisica).toBeUndefined();
    });
  });

  describe('Criterio 3: Manejo de Identificador Inválido / No Encontrado', () => {
    it('debe responder explícitamente con mensaje "certificado no verificable" si el serial no existe', async () => {
      mockInstrumentoModel.findOne.mockResolvedValue(null);

      await expect(service.verifyPublic('SERIAL_FALSO_O_ALTERADO')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.verifyPublic('SERIAL_FALSO_O_ALTERADO')).rejects.toThrow(
        /certificado no verificable/i,
      );
    });

    it('debe responder explícitamente con mensaje "certificado no verificable" si el serial está vacío', async () => {
      mockInstrumentoModel.findOne.mockResolvedValue(null);

      await expect(service.verifyPublic('')).rejects.toThrow(NotFoundException);
      await expect(service.verifyPublic('   ')).rejects.toThrow(/certificado no verificable/i);
    });
  });
});
