import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import { CalibracionesService } from '../src/modules/calibraciones/calibraciones.service.js';

const ID = '60d0fe4f5311236168a109aa';

function makeDoc(overrides: Record<string, any> = {}) {
  const doc: any = {
    _id: ID,
    serial: 'BASC-001',
    marca: 'Torrey',
    modelo: 'L-EQ',
    tipo: 'Bascula',
    categoriaExactitud: 'Clase III',
    capacidadMaxima: 50,
    capacidadMinima: 0.2,
    unidadMedida: 'kg',
    divisionEscala: 0.01,
    evidenciasFotograficas: { fotoEquipo: 'a', fotoPrecinto: 'b', fotoUbicacion: 'c' },
    evidenciasMeta: {},
    fechaUltimaCalibracion: new Date('2026-01-01'),
    fechaProximaCalibracion: new Date('2027-01-01'),
    estado: 'Vigente',
    activo: true,
    createdAt: new Date('2026-01-01'),
    toObject() {
      return { ...this };
    },
    markModified: vi.fn(),
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
  return doc;
}

describe('HU-06..HU-10 · gestión de equipos', () => {
  let model: any;
  let audit: any;
  let usuarioModel: any;
  let calibModel: any;
  let service: InstrumentosService;

  beforeEach(() => {
    model = { findById: vi.fn(), findOne: vi.fn(), find: vi.fn(), countDocuments: vi.fn() };
    audit = { logEvent: vi.fn(), findByInstrumentoSerial: vi.fn().mockResolvedValue([]) };
    usuarioModel = { find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([{ _id: 'u1', nombre: 'Ana Técnica', email: 'ana@x.co' }]) }) };
    calibModel = {
      find: vi.fn().mockReturnValue({
        sort: () => ({ populate: () => ({ lean: () => Promise.resolve([]) }) }),
      }),
    };
    const validation = { assertValid: vi.fn() } as any;
    service = new InstrumentosService(model, validation, audit, calibModel, usuarioModel);
  });

  describe('HU-06 · historial', () => {
    it('devuelve eventos con fecha, tipo de operación, usuario y calibraciones del serial', async () => {
      model.findById.mockResolvedValue(makeDoc());
      audit.findByInstrumentoSerial.mockResolvedValue([
        {
          _id: 'e1',
          timestamp: new Date('2026-02-01'),
          actionType: 'UPDATE',
          entityAffected: 'Instrumento',
          identifier: 'BASC-001',
          descripcion: 'Actualización',
          userId: { _id: 'u1', nombre: 'Ana Técnica', email: 'ana@x.co', rol: 'tecnico' },
          previousState: { marca: 'Torrey', modelo: 'X' },
          newState: { marca: 'Toledo', modelo: 'X' },
        },
      ]);
      calibModel.find.mockReturnValue({
        sort: () => ({
          populate: () => ({
            lean: () =>
              Promise.resolve([
                {
                  _id: 'c1',
                  numeroCertificado: 'CERT-1',
                  fechaCalibracion: new Date('2026-01-01'),
                  resultado: 'Conforme',
                  anulado: false,
                  laboratorioAcreditado: 'Lab',
                  tecnico: { nombre: 'Ana Técnica' },
                },
              ]),
          }),
        }),
      });

      const h = await service.getHistorial(ID);

      expect(h.serial).toBe('BASC-001');
      expect(audit.findByInstrumentoSerial).toHaveBeenCalledWith('BASC-001');
      expect(h.eventos[0]).toMatchObject({
        tipoOperacion: 'UPDATE',
        usuario: { nombre: 'Ana Técnica' },
        camposModificados: ['marca'],
      });
      expect(h.eventos[0].fecha).toBeInstanceOf(Date);
      expect(h.calibraciones[0]).toMatchObject({ numeroCertificado: 'CERT-1', resultado: 'Conforme' });
    });

    it('es solo lectura: no expone operaciones de borrado de eventos', () => {
      expect((service as any).borrarHistorial).toBeUndefined();
      expect((audit as any).delete).toBeUndefined();
    });

    it('404 si el equipo no existe', async () => {
      model.findById.mockResolvedValue(null);
      await expect(service.getHistorial(ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('HU-07 · actualización', () => {
    it('no permite cambiar el número de serie', async () => {
      model.findById.mockResolvedValue(makeDoc());
      await expect(service.update(ID, { serial: 'OTRO-999' }, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('acepta el mismo serial (idempotente) y registra actualizadoPor + auditoría', async () => {
      const doc = makeDoc();
      model.findById.mockResolvedValue(doc);
      const r = await service.update(ID, { serial: 'basc-001', marca: 'Toledo' }, 'u1');
      expect(r.marca).toBe('Toledo');
      expect(doc.actualizadoPor).toBe('u1');
      expect(audit.logEvent).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'UPDATE', userId: 'u1' }));
    });

    it('revalida los datos modificados (la validación NTC se ejecuta con los valores nuevos)', async () => {
      const validation = {
        assertValid: vi.fn().mockImplementation(() => {
          throw new BadRequestException('inválida');
        }),
      } as any;
      const svc = new InstrumentosService(model, validation, audit, calibModel, usuarioModel);
      model.findById.mockResolvedValue(makeDoc());
      await expect(svc.update(ID, { capacidadMaxima: 0.0001 }, 'u1')).rejects.toThrow();
      expect(validation.assertValid).toHaveBeenCalledWith(expect.objectContaining({ capacidadMaxima: 0.0001 }));
    });

    it('marca fecha/usuario de carga solo en las fotos que cambian', async () => {
      const doc = makeDoc();
      model.findById.mockResolvedValue(doc);
      await service.update(ID, { evidenciasFotograficas: { fotoEquipo: 'a', fotoPrecinto: 'NUEVA', fotoUbicacion: 'c' } }, 'u9');
      expect(Object.keys(doc.evidenciasMeta)).toEqual(['fotoPrecinto']);
      expect(doc.evidenciasMeta.fotoPrecinto.cargadoPor).toBe('u9');
    });
  });

  describe('HU-08 · inactivación', () => {
    it('inactiva con motivo, registra quién y audita; conserva el documento', async () => {
      const doc = makeDoc();
      model.findById.mockResolvedValue(doc);
      const r = await service.setActivo(ID, false, 'Equipo dado de baja', 'admin1');
      expect(r.activo).toBe(false);
      expect(doc.inactivadoPor).toBe('admin1');
      expect(doc.fechaInactivacion).toBeInstanceOf(Date);
      expect(audit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'STATUS_CHANGE', userId: 'admin1' }),
      );
    });

    it('exige motivo al inactivar', async () => {
      model.findById.mockResolvedValue(makeDoc());
      await expect(service.setActivo(ID, false, '', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('conflicto si ya está en ese estado', async () => {
      model.findById.mockResolvedValue(makeDoc({ activo: false }));
      await expect(service.setActivo(ID, false, 'motivo largo', 'admin1')).rejects.toThrow(ConflictException);
    });

    it('reactiva limpiando los datos de inactivación', async () => {
      const doc = makeDoc({ activo: false, inactivadoPor: 'x', motivoInactivacion: 'm' });
      model.findById.mockResolvedValue(doc);
      const r = await service.setActivo(ID, true, undefined, 'admin1');
      expect(r.activo).toBe(true);
      expect(doc.inactivadoPor).toBeUndefined();
    });

    it('un equipo inactivo NO puede usarse en una nueva calibración', async () => {
      const calModel: any = { findOne: vi.fn() };
      const instModel: any = { findById: vi.fn().mockResolvedValue(makeDoc({ activo: false })) };
      const calService = new CalibracionesService(calModel, instModel, {} as any, audit, {} as any);
      await expect(
        calService.create({ instrumentoId: ID, numeroCertificado: 'X' } as any, 'u1'),
      ).rejects.toThrow(/inactivo/);
    });
  });

  describe('HU-09 · evidencias', () => {
    it('lista tipo, url, fecha de carga y usuario que cargó', async () => {
      const fecha = new Date('2026-03-03');
      model.findById.mockResolvedValue(
        makeDoc({ evidenciasMeta: { fotoEquipo: { fechaCarga: fecha, cargadoPor: 'u1' } } }),
      );
      const r = await service.getEvidencias(ID);
      expect(r.evidencias.map((e) => e.tipo)).toEqual(['fotoEquipo', 'fotoPrecinto', 'fotoUbicacion']);
      expect(r.evidencias[0]).toMatchObject({
        etiqueta: 'Equipo',
        fechaCarga: fecha,
        cargadoPor: { id: 'u1', nombre: 'Ana Técnica' },
      });
    });

    it('reemplaza una foto, la asocia al equipo y registra el usuario', async () => {
      const doc = makeDoc();
      model.findById.mockResolvedValue(doc);
      await service.reemplazarEvidencia(ID, 'fotoPrecinto', 'data:image/png;base64,AAA', 'u1');
      expect(doc.evidenciasFotograficas.fotoPrecinto).toBe('data:image/png;base64,AAA');
      expect(doc.evidenciasMeta.fotoPrecinto.cargadoPor).toBe('u1');
    });

    it('rechaza tipos inválidos, imágenes vacías y equipos inexistentes (sin equipo no hay evidencia)', async () => {
      await expect(service.reemplazarEvidencia(ID, 'fotoLuna', 'x', 'u1')).rejects.toThrow(BadRequestException);
      await expect(service.reemplazarEvidencia(ID, 'fotoEquipo', '  ', 'u1')).rejects.toThrow(BadRequestException);
      model.findById.mockResolvedValue(null);
      await expect(service.reemplazarEvidencia(ID, 'fotoEquipo', 'x', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('HU-10 · filtros', () => {
    function mockFind() {
      const chain: any = {
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        populate: () => chain,
        exec: () => Promise.resolve([]),
      };
      model.find.mockReturnValue(chain);
      model.countDocuments.mockReturnValue({ exec: () => Promise.resolve(0) });
    }

    it('traduce marca, activo, rango de capacidad y fecha de registro a filtros de Mongo', async () => {
      mockFind();
      await service.findAll({
        marca: 'tor',
        activo: 'false',
        capacidadDesde: 10,
        capacidadHasta: 100,
        registroDesde: '2026-01-01',
        registroHasta: '2026-01-31',
        tipo: 'Bascula',
        categoriaExactitud: 'Clase III',
        unidadMedida: 'kg',
        estado: 'Vigente',
      } as any);
      const filtro = model.find.mock.calls[0][0];
      expect(filtro.marca).toBeInstanceOf(RegExp);
      expect(filtro.activo).toBe(false);
      expect(filtro.capacidadMaxima).toEqual({ $gte: 10, $lte: 100 });
      expect(filtro.createdAt.$gte).toEqual(new Date('2026-01-01'));
      expect(filtro.createdAt.$lte.toISOString()).toBe('2026-01-31T23:59:59.999Z');
      expect(filtro).toMatchObject({ tipo: 'Bascula', categoriaExactitud: 'Clase III', unidadMedida: 'kg', estado: 'Vigente' });
    });

    it('activo=true incluye equipos antiguos sin el campo', async () => {
      mockFind();
      await service.findAll({ activo: 'true' } as any);
      expect(model.find.mock.calls[0][0].activo).toEqual({ $ne: false });
    });
  });
});
