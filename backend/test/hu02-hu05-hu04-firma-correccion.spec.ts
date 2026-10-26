import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import { CalibracionesService } from '../src/modules/calibraciones/calibraciones.service.js';
import { CalibracionesController } from '../src/modules/calibraciones/calibraciones.controller.js';
import { InstrumentosController } from '../src/modules/instrumentos/instrumentos.controller.js';
import { PesaValidator } from '../src/modules/instrumentos/validators/pesa.validator.js';
import { DinamometroValidator } from '../src/modules/instrumentos/validators/dinamometro.validator.js';
import { BasculaValidator } from '../src/modules/instrumentos/validators/bascula.validator.js';
import {
  signCertificate,
  verifyCertificateSignature,
  buildSignedVerificationUrl,
} from '../src/modules/calibraciones/qr-signature.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator.js';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy.js';
import { RolUsuario } from '../src/schemas/usuario.schema.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
  EstadoInstrumento,
} from '../src/schemas/instrumento.schema.js';
import { ResultadoCalibracion } from '../src/schemas/calibracion.schema.js';
import { TipoAccionAuditoria } from '../src/schemas/trazabilidad-evento.schema.js';

const baseData = (over: Record<string, unknown> = {}) => ({
  serial: 'X-1',
  marca: 'M',
  modelo: 'MD',
  tipo: TipoInstrumento.PESA,
  categoriaExactitud: CategoriaExactitud.CLASE_II,
  capacidadMaxima: 10,
  unidadMedida: UnidadMedida.KG,
  fechaUltimaCalibracion: new Date('2026-01-01'),
  fechaProximaCalibracion: new Date('2027-01-01'),
  ...over,
});

describe('HU-02: division de escala en Pesa/Dinamometro y errores por campo', () => {
  it('PesaValidator: divisionEscala opcional; invalida si <= 0 o mayor al valor nominal', () => {
    const v = new PesaValidator();
    expect(v.validate(baseData() as any).isValid).toBe(true);
    expect(v.validate(baseData({ divisionEscala: 0.001 }) as any).isValid).toBe(true);

    const cero = v.validate(baseData({ divisionEscala: 0 }) as any);
    expect(cero.isValid).toBe(false);
    expect(cero.fieldErrors?.[0].campo).toBe('divisionEscala');

    const grande = v.validate(baseData({ divisionEscala: 20 }) as any);
    expect(grande.isValid).toBe(false);
    expect(grande.fieldErrors?.map((e) => e.campo)).toContain('divisionEscala');
  });

  it('DinamometroValidator: exige al menos 100 divisiones y d <= Max', () => {
    const v = new DinamometroValidator();
    const d = (over: Record<string, unknown>) => baseData({ tipo: TipoInstrumento.DINAMOMETRO, ...over }) as any;
    expect(v.validate(d({ divisionEscala: 0.1 })).isValid).toBe(true); // n = 100
    const pocas = v.validate(d({ divisionEscala: 1 })); // n = 10
    expect(pocas.isValid).toBe(false);
    expect(pocas.fieldErrors?.[0].campo).toBe('divisionEscala');
    expect(v.validate(d({ divisionEscala: 50 })).isValid).toBe(false);
    expect(v.validate(d({ divisionEscala: -1 })).isValid).toBe(false);
  });

  it('errors (string[]) se conserva y fieldErrors lo acompana con el campo', () => {
    const r = new BasculaValidator().validate(
      baseData({ tipo: TipoInstrumento.BASCULA, capacidadMinima: 20, divisionEscala: 0 }) as any,
    );
    expect(r.errors.length).toBe(r.fieldErrors!.length);
    expect(r.errors.every((m) => typeof m === 'string')).toBe(true);
    expect(r.fieldErrors!.map((e) => e.campo)).toEqual(expect.arrayContaining(['capacidadMinima', 'divisionEscala']));
  });

  it('InstrumentosService.create responde 400 con errors y fieldErrors', async () => {
    const model: any = { findOne: vi.fn().mockResolvedValue(null) };
    const engine: any = {
      assertValid: vi.fn(() => {
        throw new BadRequestException({ message: 'x', errors: ['e1'] });
      }),
      validate: vi.fn().mockReturnValue({ isValid: false, errors: ['e1'], fieldErrors: [{ campo: 'divisionEscala', mensaje: 'e1' }] }),
    };
    const svc = new InstrumentosService(model, engine, { logEvent: vi.fn() } as any);
    try {
      await svc.create(
        { ...baseData(), serial: 'ABC', fechaUltimaCalibracion: '2026-01-01', fechaProximaCalibracion: '2027-01-01' } as any,
        'u1',
      );
      expect.unreachable();
    } catch (e: any) {
      const body = e.getResponse();
      expect(body.errors).toEqual(['e1']);
      expect(body.fieldErrors).toEqual([{ campo: 'divisionEscala', mensaje: 'e1' }]);
    }
  });
});

describe('HU-05: firma HMAC del QR y verificacion publica', () => {
  beforeEach(() => {
    vi.stubEnv('QR_SIGNING_SECRET', 'secreto-test-qr-1234567890');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('firma determinista, sensible a cert y serial, y verificable', () => {
    const sig = signCertificate('CERT-1', 'bas-001');
    expect(sig).toBe(signCertificate('CERT-1', 'BAS-001')); // serial normalizado
    expect(verifyCertificateSignature('CERT-1', 'BAS-001', sig)).toBe(true);
    expect(verifyCertificateSignature('CERT-2', 'BAS-001', sig)).toBe(false);
    expect(verifyCertificateSignature('CERT-1', 'BAS-002', sig)).toBe(false);
    expect(verifyCertificateSignature('CERT-1', 'BAS-001', undefined)).toBe(false);
    expect(verifyCertificateSignature('CERT-1', 'BAS-001', 'x'.repeat(sig.length))).toBe(false);
  });

  it('sin QR_SIGNING_SECRET deriva de JWT_SECRET y distinto de el', () => {
    vi.stubEnv('QR_SIGNING_SECRET', '');
    vi.stubEnv('JWT_SECRET', 'jwt-secret-abc');
    const a = signCertificate('C', 'S');
    vi.stubEnv('JWT_SECRET', 'jwt-secret-xyz');
    expect(signCertificate('C', 'S')).not.toBe(a);
    vi.stubEnv('JWT_SECRET', '');
    expect(() => signCertificate('C', 'S')).toThrow();
  });

  it('la URL del QR incluye cert, serial y sig', () => {
    const url = new URL(buildSignedVerificationUrl('http://localhost:5173/', 'CERT-1', 'BAS-001'));
    expect(url.searchParams.get('cert')).toBe('CERT-1');
    expect(url.searchParams.get('serial')).toBe('BAS-001');
    expect(verifyCertificateSignature('CERT-1', 'BAS-001', url.searchParams.get('sig'))).toBe(true);
  });

  const instrumento: any = {
    _id: 'i1',
    serial: 'BAS-001',
    marca: 'T',
    modelo: 'M',
    tipo: TipoInstrumento.BASCULA,
    categoriaExactitud: CategoriaExactitud.CLASE_III,
    capacidadMaxima: 10,
    unidadMedida: UnidadMedida.KG,
    divisionEscala: 0.01,
    estado: EstadoInstrumento.VIGENTE,
    fechaUltimaCalibracion: new Date('2026-01-01'),
    fechaProximaCalibracion: new Date('2099-01-01'),
    propietario: { nombreRazonSocial: 'SECRETO SAS', nitRut: '1' },
    creadoPor: 'u1',
  };

  function build(calDoc: any, audit = { logEvent: vi.fn().mockResolvedValue({}) }) {
    const calModel: any = {
      findOne: vi.fn().mockImplementation(() => {
        const q: any = Promise.resolve(calDoc);
        q.populate = vi.fn().mockResolvedValue(calDoc);
        q.sort = vi.fn().mockResolvedValue(calDoc);
        return q;
      }),
      findById: vi.fn().mockResolvedValue({ numeroCertificado: 'CERT-NEW' }),
    };
    const instModel: any = {
      findOne: vi.fn().mockResolvedValue(instrumento),
      findById: vi.fn().mockResolvedValue(instrumento),
    };
    const svc = new InstrumentosService(instModel, { assertValid: vi.fn(), validate: vi.fn() } as any, audit as any, calModel);
    return { svc, audit, calModel };
  }

  const cal = (over: Record<string, unknown> = {}): any => ({
    _id: 'c1',
    numeroCertificado: 'CERT-1',
    codigoFolio: 'F1',
    fechaCalibracion: new Date('2026-01-01'),
    resultado: ResultadoCalibracion.CONFORME,
    instrumento,
    ...over,
  });

  it('QR con firma valida y cert del serial: verifica', async () => {
    const { svc } = build(cal());
    const r = await svc.verifyPublic('BAS-001', { cert: 'CERT-1', sig: signCertificate('CERT-1', 'BAS-001') });
    expect(r.serial).toBe('BAS-001');
    expect(r.esVigente).toBe(true);
    expect((r as any).propietario).toBeUndefined();
  });

  it('QR sin sig o con sig alterada: 404 certificado no verificable y auditado', async () => {
    const { svc, audit } = build(cal());
    await expect(svc.verifyPublic('BAS-001', { cert: 'CERT-1' })).rejects.toThrow(NotFoundException);
    await expect(svc.verifyPublic('BAS-001', { cert: 'CERT-1', sig: 'falsa' })).rejects.toThrow('certificado no verificable');
    expect(audit.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: TipoAccionAuditoria.VERIFICATION_FAILURE }),
    );
  });

  it('cert y serial de registros distintos (aunque la firma sea valida para ese par): 404', async () => {
    const otro = { ...instrumento, serial: 'OTRO-9' };
    const { svc } = build(cal({ instrumento: otro }));
    await expect(
      svc.verifyPublic('BAS-001', { cert: 'CERT-1', sig: signCertificate('CERT-1', 'BAS-001') }),
    ).rejects.toThrow('certificado no verificable');
  });

  it('consulta manual por serial sin QR sigue funcionando (transicion)', async () => {
    const { svc } = build(cal());
    const r = await svc.verifyPublic('BAS-001');
    expect(r.serial).toBe('BAS-001');
  });

  it('GET publico por id devuelve solo el DTO sanitizado', async () => {
    const { svc } = build(cal());
    const r: any = await svc.verifyPublicById('60d0fe4f5311236168a109aa');
    expect(r.propietario).toBeUndefined();
    expect(r.creadoPor).toBeUndefined();
    expect(r.evidenciasFotograficas).toBeUndefined();
    await expect(svc.verifyPublicById('no-es-objectid')).rejects.toThrow('certificado no verificable');
  });

  it('certificado anulado se verifica como anulado / no vigente', async () => {
    const anulado = cal({ anulado: true, certificadoReemplazadoPor: 'c2' });
    const { svc } = build(anulado);
    const r = await svc.verifyPublic('BAS-001', { cert: 'CERT-1', sig: signCertificate('CERT-1', 'BAS-001') });
    expect(r.certificadoAnulado).toBe(true);
    expect(r.esVigente).toBe(false);
    expect(r.ultimoCertificado?.anulado).toBe(true);
    expect(r.ultimoCertificado?.reemplazadoPorNumero).toBe('CERT-NEW');
    expect(r.mensajeVerificacion).toMatch(/ANULADO/);
  });
});

describe('HU-04: correccion formal de certificado sellado', () => {
  function build(original: any) {
    const calModel: any = {
      findById: vi.fn().mockResolvedValue(original),
      updateOne: vi.fn().mockResolvedValue({}),
    };
    const certModel: any = { updateOne: vi.fn().mockResolvedValue({}) };
    const audit: any = { logEvent: vi.fn().mockResolvedValue({}) };
    const svc = new CalibracionesService(calModel, {} as any, {} as any, audit, {} as any, certModel);
    vi.spyOn(svc, 'create').mockResolvedValue({ id: 'nuevo1', numeroCertificado: 'CERT-NEW' } as any);
    vi.spyOn(svc, 'findById').mockResolvedValue({ id: 'nuevo1' } as any);
    return { svc, calModel, certModel, audit };
  }
  const original = (over: Record<string, unknown> = {}): any => ({
    _id: 'orig1',
    instrumento: 'inst1',
    numeroCertificado: 'CERT-OLD',
    anulado: false,
    bloqueadoInmutable: true,
    ...over,
  });
  const dto = (over: Record<string, unknown> = {}): any => ({
    motivo: 'Error de transcripcion en el EMP',
    nuevaCalibracion: { numeroCertificado: 'CERT-NEW' },
    ...over,
  });

  it('exige motivo (minimo 10 caracteres)', async () => {
    const { svc } = build(original());
    await expect(svc.corregir('orig1', dto({ motivo: 'corto' }), 'u1')).rejects.toThrow(BadRequestException);
    await expect(svc.corregir('orig1', dto({ motivo: '   ' }), 'u1')).rejects.toThrow(BadRequestException);
  });

  it('anula el original (solo campos de estado), enlaza el reemplazo y audita', async () => {
    const { svc, calModel, certModel, audit } = build(original());
    await svc.corregir('orig1', dto(), 'u1', '1.1.1.1', 'UA');

    expect(svc.create).toHaveBeenCalledWith(
      expect.objectContaining({ instrumentoId: 'inst1', numeroCertificado: 'CERT-NEW' }),
      'u1',
      '1.1.1.1',
      'UA',
    );
    const [, update] = calModel.updateOne.mock.calls[0];
    expect(Object.keys(update.$set).sort()).toEqual(
      ['anulado', 'anuladoPor', 'certificadoReemplazadoPor', 'fechaAnulacion', 'motivoAnulacion'].sort(),
    );
    expect(update.$set.certificadoReemplazadoPor).toBe('nuevo1');
    expect(calModel.updateOne).toHaveBeenCalledWith({ _id: 'nuevo1' }, { $set: { reemplazaA: 'orig1' } });
    expect(certModel.updateOne).toHaveBeenCalled();
    expect(audit.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: TipoAccionAuditoria.ANNUL,
        identifier: 'CERT-OLD',
        userId: 'u1',
      }),
    );
  });

  it('no permite anular dos veces, ni reutilizar el numero, ni un id inexistente', async () => {
    await expect(build(original({ anulado: true })).svc.corregir('orig1', dto(), 'u1')).rejects.toThrow(ConflictException);
    await expect(
      build(original()).svc.corregir('orig1', dto({ nuevaCalibracion: { numeroCertificado: 'CERT-OLD' } }), 'u1'),
    ).rejects.toThrow(ConflictException);
    await expect(build(null).svc.corregir('x', dto(), 'u1')).rejects.toThrow(NotFoundException);
  });

  it('update/delete del certificado sellado siguen prohibidos (inmutable)', async () => {
    const { svc } = build(original());
    await expect(svc.update('orig1', {} as any, 'u1')).rejects.toThrow(/inmutable/);
    await expect(svc.delete('orig1', 'u1')).rejects.toThrow(/inmutable/);
  });

  it('el endpoint solo admite ADMIN y TECNICO', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, CalibracionesController.prototype.corregir);
    expect(roles).toEqual([RolUsuario.ADMIN, RolUsuario.TECNICO]);
  });
});

describe('HU-03: operacion no autorizada = 403 y usuario inactivo no opera', () => {
  const ctx = (user: any, handler: any): any => ({
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user, method: 'POST', originalUrl: '/api/x', headers: {}, socket: {} }),
    }),
  });

  it.each([RolUsuario.AUDITOR, RolUsuario.SIC, RolUsuario.CIUDADANO, RolUsuario.INSTITUCION_ACREDITACION])(
    'rol %s recibe 403 al corregir/anular certificados y se audita',
    async (rol) => {
      const audit: any = { logEvent: vi.fn().mockResolvedValue({}) };
      const guard = new RolesGuard(new Reflector(), audit);
      await expect(
        guard.canActivate(ctx({ id: 'u', rol, email: 'a@b.c' }, CalibracionesController.prototype.corregir)),
      ).rejects.toMatchObject({ status: 403 });
      expect(audit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: TipoAccionAuditoria.AUTH_FAILURE }),
      );
    },
  );

  it('TECNICO no puede eliminar instrumentos (solo ADMIN)', async () => {
    const guard = new RolesGuard(new Reflector(), { logEvent: vi.fn().mockResolvedValue({}) } as any);
    await expect(
      guard.canActivate(ctx({ id: 'u', rol: RolUsuario.TECNICO }, InstrumentosController.prototype.delete)),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('JwtStrategy: un token valido de un usuario inactivado o eliminado es rechazado (401)', async () => {
    const lean = (u: any) => ({ lean: vi.fn().mockResolvedValue(u) });
    const mk = (u: any) =>
      new JwtStrategy({ get: () => 'secret' } as any, { findById: vi.fn().mockReturnValue(lean(u)) } as any);

    await expect(
      mk({ _id: 'u1', activo: false, rol: RolUsuario.TECNICO }).validate({ sub: 'u1' } as any),
    ).rejects.toThrow(/inactivo/);
    await expect(mk(null).validate({ sub: 'u1' } as any)).rejects.toThrow(/ya no existe/);
    const ok = await mk({ _id: 'u1', activo: true, rol: RolUsuario.TECNICO, nombre: 'n', email: 'e' }).validate({
      sub: 'u1',
    } as any);
    expect(ok.rol).toBe(RolUsuario.TECNICO);
  });

  it('endpoints publicos de datos sensibles ya no son publicos: listado e historial de calibraciones', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CalibracionesController.prototype.findAll)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, CalibracionesController.prototype.findByInstrumento)).toBeUndefined();
  });
});
