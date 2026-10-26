import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../src/schemas/instrumento.schema.js';

const lejos = new Date();
lejos.setUTCFullYear(lejos.getUTCFullYear() + 1);
lejos.setUTCHours(0, 0, 0, 0);

const instNC = {
  _id: '60d0fe4f5311236168a109aa',
  serial: 'QA-NC-1',
  marca: 'T',
  modelo: 'M',
  tipo: TipoInstrumento.BASCULA,
  categoriaExactitud: CategoriaExactitud.CLASE_III,
  capacidadMaxima: 30,
  capacidadMinima: 0.1,
  unidadMedida: UnidadMedida.KG,
  divisionEscala: 0.005,
  estado: EstadoInstrumento.VENCIDO,
  motivoVencimiento: 'NO_CONFORME',
  fechaUltimaCalibracion: new Date('2026-10-24T00:00:00.000Z'),
  fechaProximaCalibracion: lejos,
};

const calNC = {
  _id: '60d0fe4f5311236168a109bb',
  numeroCertificado: 'QA-CERT-NC',
  codigoFolio: 'F-1',
  fechaCalibracion: new Date('2026-10-24T00:00:00.000Z'),
  resultado: 'No Conforme',
  anulado: true,
  motivoAnulacion: 'Resultado No Conforme',
};

describe('F2 - consulta publica de un instrumento con calibracion No Conforme', () => {
  let service: InstrumentosService;
  let instrumentoModel: any;
  let calibracionModel: any;

  beforeEach(() => {
    instrumentoModel = { findOne: vi.fn().mockResolvedValue(instNC) };
    calibracionModel = {
      findOne: vi.fn().mockImplementation((filtro: any) => ({
        sort: () => Promise.resolve(filtro?.anulado ? null : calNC),
      })),
    };
    service = new InstrumentosService(
      instrumentoModel,
      { assertValid: vi.fn(), validate: vi.fn() } as any,
      { logEvent: vi.fn().mockResolvedValue({}) } as any,
      calibracionModel,
    );
  });

  it('esVigente=false, estado Vencido, certificadoAnulado=true y mensaje de no conforme', async () => {
    const r = await service.verifyPublic('QA-NC-1');
    expect(r.esVigente).toBe(false);
    expect(r.estadoMetrologico).toBe(EstadoInstrumento.VENCIDO);
    expect(r.certificadoAnulado).toBe(true);
    expect(r.ultimoCertificado?.resultado).toBe('No Conforme');
    expect(r.mensajeVerificacion).toMatch(/no conforme/i);
    expect(r.mensajeVerificacion).not.toMatch(/verificado y conforme/i);
  });

  it('un instrumento Conforme y con fecha lejana sigue siendo vigente', async () => {
    instrumentoModel.findOne.mockResolvedValue({ ...instNC, estado: EstadoInstrumento.VIGENTE, motivoVencimiento: undefined });
    calibracionModel.findOne.mockImplementation(() => ({
      sort: () => Promise.resolve({ ...calNC, resultado: 'Conforme', anulado: false }),
    }));
    const r = await service.verifyPublic('QA-NC-1');
    expect(r.esVigente).toBe(true);
    expect(r.estadoMetrologico).toBe(EstadoInstrumento.VIGENTE);
  });
});

describe('F6c - fechas publicas como fecha calendario (YYYY-MM-DD)', () => {
  it('serializa las fechas del DTO publico sin hora ni zona, sin desfase de un dia', async () => {
    const service = new InstrumentosService(
      { findOne: vi.fn().mockResolvedValue({ ...instNC, motivoVencimiento: undefined, estado: EstadoInstrumento.VIGENTE }) } as any,
      { assertValid: vi.fn(), validate: vi.fn() } as any,
      { logEvent: vi.fn().mockResolvedValue({}) } as any,
      { findOne: () => ({ sort: () => Promise.resolve({ ...calNC, anulado: false, resultado: 'Conforme' }) }) } as any,
    );
    const r: any = await service.verifyPublic('QA-NC-1');
    expect(r.fechaUltimaCalibracion).toBe('2026-10-24');
    expect(r.fechaProximaCalibracion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.ultimoCertificado.fechaCalibracion).toBe('2026-10-24');
  });
});
