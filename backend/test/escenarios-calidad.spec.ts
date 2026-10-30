/**
 * Escenarios de calidad U1-U3, S1, S3, C1-C3, M1-M3 (S2 vive en s2-login-rate-limit.spec.ts).
 * Cada bloque comprueba la MEDIDA concreta del escenario. Se apoya en lo ya cubierto por
 * rf001-rf002, rf003-rf004, rf010, public-verification y pdf-generator, y solo agrega lo que falta.
 *
 * Alcance en el frontend (U1-U3): aqui se automatiza lo verificable sin navegador (calculo WCAG de
 * contraste de los tokens, etiquetas y encabezados del login, flujo QR->consulta). La medicion de
 * tiempo real, Lighthouse y axe sobre la UI renderizada se ejecuta en Chrome (ver docs/qa/).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi } from 'vitest';

import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import {
  INSTRUMENTO_VALIDATORS,
  ValidationEngineService,
} from '../src/modules/instrumentos/validators/validation-engine.service.js';
import { INSTRUMENTO_VALIDATOR_CLASSES } from '../src/modules/instrumentos/instrumentos.module.js';
import type {
  InstrumentoValidator,
  InstrumentoValidationData,
} from '../src/modules/instrumentos/validators/instrumento-validator.interface.js';
import { BasculaValidator } from '../src/modules/instrumentos/validators/bascula.validator.js';
import { PesaValidator } from '../src/modules/instrumentos/validators/pesa.validator.js';
import { DinamometroValidator } from '../src/modules/instrumentos/validators/dinamometro.validator.js';
import { AlertasService } from '../src/modules/alertas/alertas.service.js';
import {
  CANALES_NOTIFICACION_TOKEN,
  NotificadorEngineService,
} from '../src/modules/alertas/notificador-engine.service.js';
import { CANALES_NOTIFICACION } from '../src/modules/alertas/alertas.module.js';
import type {
  CanalNotificacionStrategy,
  NotificationPayload,
} from '../src/modules/alertas/strategies/canal-notificacion.interface.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { CalibracionesService } from '../src/modules/calibraciones/calibraciones.service.js';
import {
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../src/schemas/instrumento.schema.js';
import {
  EstadoInstrumento,
  NivelAlerta,
  ResultadoCalibracion,
  EstadoCertificado,
  TipoAccionAuditoria,
} from '../src/schemas/index.js';
import { RolUsuario } from '../src/schemas/usuario.schema.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dir, rel), 'utf8');

// ---------------------------------------------------------------- utilidades WCAG
const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ================================================================== U1
describe('U1 - Verificación pública por QR (<=30 s y <=3 interacciones)', () => {
  it('U1: la consulta pública resuelve en una sola lectura y muy por debajo de 30 s', async () => {
    const findOne = vi.fn().mockResolvedValue({
      serial: 'BAL-1',
      marca: 'T',
      modelo: 'M',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 30,
      capacidadMinima: 0.1,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.005,
      fechaUltimaCalibracion: new Date(),
      fechaProximaCalibracion: new Date(Date.now() + 90 * 864e5),
    });
    const svc = new InstrumentosService(
      { findOne } as any,
      { validate: vi.fn(), assertValid: vi.fn() } as any,
      { logEvent: vi.fn() } as any,
    );
    const t0 = performance.now();
    const res = await svc.verifyPublic('BAL-1');
    const ms = performance.now() - t0;
    expect(res.serial).toBe('BAL-1');
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(ms).toBeLessThan(30_000);
  });

  it('U1: escanear el QR es la única interacción: la vista consulta sola al cargar (<=3 interacciones)', () => {
    const app = read('../../frontend/src/App.tsx');
    const view = read('../../frontend/src/components/public/PublicVerificationView.tsx');
    // Interacción 1: escanear/abrir el QR. La URL abre directamente la consulta pública...
    expect(app).toMatch(/initialVerification\s*\?\s*'consulta-publica'/);
    // ...e inicia la búsqueda sin clics adicionales (interacciones 2 y 3 = 0).
    expect(view).toMatch(/useEffect\(\(\) => {[\s\S]{0,400}initialSerial\.trim\(\)[\s\S]{0,200}handleSearch\(initialSerial\)/);
  });
});

// ================================================================== U2
describe('U2 - Prevención de errores al registrar (duplicados)', () => {
  it('U2: un serial duplicado se rechaza con 409 que nombra el serial, antes de guardar', async () => {
    const save = vi.fn();
    const Model: any = class {
      save = save;
    };
    Model.findOne = vi.fn().mockResolvedValue({ serial: 'BASC-EXISTENTE' });
    const svc = new InstrumentosService(
      Model,
      { assertValid: vi.fn() } as any,
      { logEvent: vi.fn() } as any,
    );
    const dto: any = {
      serial: ' basc-existente ',
      marca: 'T',
      modelo: 'M',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 50,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.01,
      fechaUltimaCalibracion: '2026-01-01',
      fechaProximaCalibracion: '2027-01-01',
    };
    await expect(svc.create(dto, 'u1')).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.create(dto, 'u1')).rejects.toThrow(/BASC-EXISTENTE/);
    expect(save).not.toHaveBeenCalled();
  });
});

// ================================================================== U3
describe('U3 - Etiquetado accesible (0 violaciones de etiquetas / contraste WCAG AA)', () => {
  const tokens = read('../../frontend/src/styles/tokens.css');
  const tok = (name: string) => tokens.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))![1];

  it('U3: los colores de estado y texto secundario cumplen >=4.5:1 sobre sus fondos', () => {
    const pares: [string, string, string][] = [
      ['--ok', tok('--ok'), '#FFFFFF'],
      ['--ok sobre --ok-bg', tok('--ok'), tok('--ok-bg')],
      ['--warn', tok('--warn'), '#FFFFFF'],
      ['--warn sobre --warn-bg', tok('--warn'), tok('--warn-bg')],
      ['--danger', tok('--danger'), '#FFFFFF'],
      ['--danger sobre --danger-bg', tok('--danger'), tok('--danger-bg')],
      ['--text-muted', tok('--text-muted'), '#FFFFFF'],
      ['--text-muted sobre --bg-app', tok('--text-muted'), tok('--bg-app')],
      ['--text-muted sobre --blue-50', tok('--text-muted'), tok('--blue-50')],
      ['--blue-600', tok('--blue-600'), '#FFFFFF'],
      ['blanco sobre --ok', '#FFFFFF', tok('--ok')],
      ['--ok-on-dark sobre --gov-bar', tok('--ok-on-dark'), tok('--gov-bar')],
    ];
    for (const [n, fg, bg] of pares) {
      expect(ratio(fg, bg), `${n}: ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('U3: el login etiqueta cada campo (htmlFor/id) y tiene un único h1 con h2 debajo', () => {
    const login = read('../../frontend/src/components/auth/LoginView.tsx');
    const ids = [...login.matchAll(/<(?:input|select)\s[^>]*?id="([^"]+)"/gs)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    for (const id of ids) expect(login).toContain(`htmlFor="${id}"`);
    expect((login.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(login).not.toMatch(/<h[3-6][\s>]/);
    expect(login).toMatch(/<h2[\s>]/);
  });
});

// ================================================================== S1
describe('S1 - Acceso fuera de rol (403 y 100 % auditado)', () => {
  it('S1: N accesos fuera de rol -> N respuestas 403 y N eventos AUTH_FAILURE (100 %)', async () => {
    const logEvent = vi.fn().mockResolvedValue({});
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);
    const guard = new RolesGuard(reflector, { logEvent } as unknown as AuditService);
    const ctx = (rol: RolUsuario | null) =>
      ({
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: rol ? { id: 'u', email: 'x@y.co', rol } : null,
            method: 'DELETE',
            url: '/api/usuarios/1',
            ip: '10.0.0.9',
            headers: {},
          }),
        }),
      }) as any;

    const intentos = [RolUsuario.TECNICO, RolUsuario.AUDITOR, null, RolUsuario.TECNICO, null];
    let denegados = 0;
    for (const rol of intentos) {
      await guard.canActivate(ctx(rol)).catch((e) => {
        if (e instanceof ForbiddenException) denegados++;
      });
    }
    expect(denegados).toBe(intentos.length);
    expect(logEvent).toHaveBeenCalledTimes(intentos.length);
    for (const [arg] of logEvent.mock.calls) {
      expect(arg.actionType).toBe(TipoAccionAuditoria.AUTH_FAILURE);
    }
    // El rol autorizado no genera ni 403 ni auditoría.
    logEvent.mockClear();
    await expect(guard.canActivate(ctx(RolUsuario.ADMIN))).resolves.toBe(true);
    expect(logEvent).not.toHaveBeenCalled();
  });
});

// ================================================================== S3
describe('S3 - Consulta pública con serial falso (404 "no verificable", solo campos del DTO)', () => {
  const dtoSrc = read('../src/modules/instrumentos/dto/public-verification.dto.ts');
  const dtoClass = dtoSrc.slice(dtoSrc.indexOf('export class PublicVerificationDto'));
  const permitidos = new Set([...dtoClass.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]));

  it('S3: serial falso -> 404 "certificado no verificable"', async () => {
    const svc = new InstrumentosService(
      { findOne: vi.fn().mockResolvedValue(null) } as any,
      {} as any,
      { logEvent: vi.fn() } as any,
    );
    const err: any = await svc.verifyPublic('SERIAL-FALSO-123').catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.getStatus()).toBe(404);
    expect(err.message).toMatch(/certificado no verificable/i);
  });

  it('S3: una consulta válida expone únicamente claves declaradas en PublicVerificationDto', async () => {
    const svc = new InstrumentosService(
      {
        findOne: vi.fn().mockResolvedValue({
          _id: 'x',
          serial: 'BAL-1',
          marca: 'T',
          modelo: 'M',
          tipo: TipoInstrumento.BASCULA,
          categoriaExactitud: CategoriaExactitud.CLASE_III,
          capacidadMaxima: 30,
          capacidadMinima: 0.1,
          unidadMedida: UnidadMedida.KG,
          divisionEscala: 0.005,
          estado: EstadoInstrumento.VIGENTE,
          fechaUltimaCalibracion: new Date(),
          fechaProximaCalibracion: new Date(Date.now() + 90 * 864e5),
          propietario: { nombreRazonSocial: 'SECRETO SAS', nitRut: '900' },
          ubicacionFisica: 'privada',
          creadoPor: 'u1',
          actualizadoPor: 'u2',
        }),
      } as any,
      {} as any,
      { logEvent: vi.fn() } as any,
    );
    const res: any = await svc.verifyPublic('BAL-1');
    expect(permitidos.size).toBeGreaterThan(10);
    for (const k of Object.keys(res)) {
      expect(permitidos.has(k), `clave no permitida: ${k}`).toBe(true);
    }
    expect(JSON.stringify(res)).not.toMatch(/SECRETO|900/);
  });
});

// ================================================================== C1
describe('C1 - Rechazo de datos que violan NTC 2031, con desglose', () => {
  const engine = new ValidationEngineService([
    new BasculaValidator(),
    new PesaValidator(),
    new DinamometroValidator(),
  ]);
  const base: InstrumentoValidationData = {
    serial: 'B-1',
    marca: 'T',
    modelo: 'M',
    tipo: TipoInstrumento.BASCULA,
    categoriaExactitud: CategoriaExactitud.CLASE_III,
    capacidadMaxima: 10,
    unidadMedida: UnidadMedida.KG,
    divisionEscala: 1, // n = 10 < 100
    fechaUltimaCalibracion: new Date('2027-01-01'),
    fechaProximaCalibracion: new Date('2026-01-01'), // anterior a la última
  };

  it('C1: varias violaciones a la vez se rechazan (400) y se devuelven TODAS desglosadas', () => {
    const r = engine.validate(base);
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
    expect(new Set(r.errors).size).toBe(r.errors.length);
    let capturado: any;
    try {
      engine.assertValid(base);
    } catch (e) {
      capturado = e;
    }
    expect(capturado.getStatus()).toBe(400);
    expect(capturado.getResponse().errors).toEqual(r.errors);
  });
});

// ================================================================== C2
describe('C2 - El resultado de calibración define el estado', () => {
  const montar = (resultado: ResultadoCalibracion) => {
    const certs: any[] = [];
    const Cal: any = class {
      _id = { toString: () => 'cal1' };
      constructor(d: any) {
        Object.assign(this, d);
      }
      async save() {
        return this;
      }
      static findOne = vi.fn().mockResolvedValue(null);
    };
    const Cert: any = class {
      constructor(d: any) {
        certs.push(d);
        Object.assign(this, d);
      }
      async save() {
        return this;
      }
    };
    const instrumento: any = {
      _id: 'i1',
      serial: 'S-1',
      estado: EstadoInstrumento.VIGENTE,
      save: vi.fn().mockResolvedValue(undefined),
    };
    const svc = new CalibracionesService(
      Cal,
      { findById: vi.fn().mockResolvedValue(instrumento) } as any,
      { calcularEstado: vi.fn().mockReturnValue(EstadoInstrumento.VIGENTE) } as any,
      { logEvent: vi.fn().mockResolvedValue({}) } as any,
      {} as any,
      Cert,
    );
    // La respuesta se arma con findById (populate); aqui solo interesa el efecto en estados.
    (svc as any).findById = vi.fn().mockResolvedValue({});
    const dto: any = {
      instrumentoId: 'i1',
      numeroCertificado: 'C-1',
      resultado,
      fechaCalibracion: '2026-02-01',
      fechaProximaCalibracion: '2027-02-01',
      laboratorioAcreditado: 'Lab',
      patronesUtilizados: [
        {
          codigoPatron: 'P',
          descripcion: 'd',
          certificadoTrazabilidad: 'c',
          fechaVencimientoPatron: '2028-01-01',
        },
      ],
      erroresMaximosPermitidos: [
        {
          cargaNominal: 10,
          errorEncontrado: 1,
          errorMaximoPermitido: 2,
          cumple: resultado === ResultadoCalibracion.CONFORME,
        },
      ],
    };
    return { svc, dto, instrumento, certs };
  };

  it('C2: CONFORME -> certificado VALIDO e instrumento no vencido', async () => {
    const { svc, dto, instrumento, certs } = montar(ResultadoCalibracion.CONFORME);
    await svc.create(dto, 'tec1');
    expect(certs[0].estado).toBe(EstadoCertificado.VALIDO);
    expect(instrumento.estado).not.toBe(EstadoInstrumento.VENCIDO);
  });

  it('C2: NO CONFORME -> certificado ANULADO e instrumento VENCIDO', async () => {
    const { svc, dto, instrumento, certs } = montar(ResultadoCalibracion.NO_CONFORME);
    await svc.create(dto, 'tec1');
    expect(certs[0].estado).toBe(EstadoCertificado.ANULADO);
    expect(instrumento.estado).toBe(EstadoInstrumento.VENCIDO);
  });

  it('C2/R3: flujo real No Conforme -> escaneo -> alerta VENCIDA sin diasRestantes (null)', async () => {
    const { svc, dto, instrumento } = montar(ResultadoCalibracion.NO_CONFORME);
    instrumento.marca = 'M';
    instrumento.modelo = 'X';
    await svc.create(dto, 'tec1');
    expect(instrumento.motivoVencimiento).toBe('NO_CONFORME');
    // La fecha próxima queda lejana (2027): por fecha habría "cientos de días".
    const guardadas: any[] = [];
    const AlertaM: any = class {
      _id = { toString: () => 'a1' };
      constructor(d: any) {
        Object.assign(this, d);
      }
      async save() {
        guardadas.push(this);
        return this;
      }
      static findOne = vi.fn().mockResolvedValue(null);
    };
    const alertas = new AlertasService(
      AlertaM,
      { find: () => ({ exec: async () => [instrumento] }) } as any,
      { dispatch: vi.fn().mockResolvedValue(['SISTEMA']) } as any,
      { logEvent: vi.fn() } as any,
    );
    const r = await alertas.scanAlertas();
    expect(r.alertasGeneradas).toBe(1);
    expect(r.alertas[0].nivelCriticidad).toBe(NivelAlerta.VENCIDA);
    expect(r.alertas[0].diasRestantes).toBeNull();
    expect(guardadas[0].diasRestantes).toBeNull();
  });

  it('R3: una alerta No Conforme antigua (diasRestantes 341 guardado) se serializa con null', async () => {
    const vieja: any = {
      _id: { toString: () => 'old' },
      nivelCriticidad: NivelAlerta.VENCIDA,
      diasRestantes: 341,
      mensaje: 'El instrumento X fue declarado NO CONFORME en su última calibración.',
      canalesNotificados: [],
    };
    const alertas = new AlertasService({} as any, {} as any, {} as any, {} as any);
    expect((alertas as any).mapToResponse(vieja).diasRestantes).toBeNull();
    const porFecha = { ...vieja, mensaje: 'VENCIDA desde hace 3 día(s)', diasRestantes: -3 };
    expect((alertas as any).mapToResponse(porFecha).diasRestantes).toBe(-3);
  });
});

// ================================================================== C3
describe('C3 - Alertas por nivel a 30/15/5 días sin repetir en 24 h', () => {
  const MS_DIA = 864e5;
  const crear = (existente: any = null) => {
    const dispatch = vi.fn().mockResolvedValue(['SISTEMA']);
    const Alerta: any = class {
      _id = { toString: () => 'alerta1' };
      constructor(d: any) {
        Object.assign(this, d);
      }
      async save() {
        return this;
      }
      static findOne = vi.fn().mockResolvedValue(existente);
    };
    const inst = (dias: number) => {
      const f = new Date();
      f.setHours(12, 0, 0, 0);
      f.setDate(f.getDate() + dias);
      return {
        _id: 'i',
        serial: `S-${dias}`,
        marca: 'M',
        modelo: 'X',
        estado: EstadoInstrumento.VIGENTE,
        fechaProximaCalibracion: f,
        save: vi.fn(),
      };
    };
    const mk = (dias: number) =>
      new AlertasService(
        Alerta,
        { find: () => ({ exec: async () => [inst(dias)] }) } as any,
        { dispatch } as any,
        { logEvent: vi.fn() } as any,
      );
    return { mk, dispatch, Alerta };
  };

  it.each([
    [31, null],
    [30, NivelAlerta.PREVENTIVA],
    [16, NivelAlerta.PREVENTIVA],
    [15, NivelAlerta.MODERADA],
    [6, NivelAlerta.MODERADA],
    [5, NivelAlerta.CRITICA],
    [0, NivelAlerta.CRITICA],
    [-1, NivelAlerta.VENCIDA],
  ])('C3: a %i días el nivel es %s', async (dias, nivel) => {
    const { mk } = crear();
    const r = await mk(dias as number).scanAlertas();
    if (nivel === null) expect(r.alertasGeneradas).toBe(0);
    else expect(r.alertas[0].nivelCriticidad).toBe(nivel);
  });

  it('C3: si ya hay alerta del mismo nivel en las últimas 24 h no se repite ni se notifica', async () => {
    const { mk, dispatch, Alerta } = crear({ _id: 'previa' });
    const r = await mk(5).scanAlertas();
    expect(r.alertasGeneradas).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
    const filtro = Alerta.findOne.mock.calls[0][0];
    const ventana = Date.now() - filtro.createdAt.$gte.getTime();
    expect(Math.abs(ventana - MS_DIA)).toBeLessThan(5_000); // ventana de 24 h
    expect(filtro.nivelCriticidad).toBe(NivelAlerta.CRITICA);
  });
});

// ================================================================== M1
describe('M1 - Nuevo tipo de instrumento (0 cambios a validators existentes)', () => {
  class TermometroValidator implements InstrumentoValidator {
    supports(tipo: TipoInstrumento) {
      return (tipo as string) === 'Termometro';
    }
    validate(d: InstrumentoValidationData) {
      return d.capacidadMaxima > 0
        ? { isValid: true, errors: [] }
        : { isValid: false, errors: ['Rango del termómetro inválido.'] };
    }
  }

  it('M1: un validator nuevo se incorpora solo con su clase y una entrada de registro', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ...INSTRUMENTO_VALIDATOR_CLASSES,
        TermometroValidator,
        {
          provide: INSTRUMENTO_VALIDATORS,
          useFactory: (...v: unknown[]) => v,
          inject: [...INSTRUMENTO_VALIDATOR_CLASSES, TermometroValidator], // la única línea nueva
        },
        ValidationEngineService,
      ],
    }).compile();
    const engine = mod.get(ValidationEngineService);
    const termo: any = { tipo: 'Termometro', capacidadMaxima: 100 };
    expect(engine.validate(termo).isValid).toBe(true);
    expect(engine.validate({ ...termo, capacidadMaxima: 0 }).errors).toContain(
      'Rango del termómetro inválido.',
    );
    // Los tipos existentes siguen resueltos por sus propios validators.
    expect(
      engine.validate({ tipo: TipoInstrumento.BASCULA, capacidadMaxima: 10 } as any).isValid,
    ).toBe(false);
  });

  it('M1: un tipo sin validator ya no pasa en silencio: se rechaza con mensaje claro', () => {
    const engine = new ValidationEngineService([new BasculaValidator()]);
    const r = engine.validate({ tipo: TipoInstrumento.PESA } as any);
    expect(r.isValid).toBe(false);
    expect(r.errors[0]).toMatch(/validador/i);
    expect(() => engine.assertValid({ tipo: TipoInstrumento.PESA } as any)).toThrow();
  });

  it('M1: el motor y los validators existentes no referencian tipos concretos ni al motor', () => {
    const motor = read('../src/modules/instrumentos/validators/validation-engine.service.ts');
    expect(motor).not.toMatch(/bascula|pesa\.validator|dinamometro/i);
    for (const f of ['bascula', 'pesa', 'dinamometro']) {
      expect(read(`../src/modules/instrumentos/validators/${f}.validator.ts`)).not.toMatch(
        /validation-engine|termometro/i,
      );
    }
  });
});

// ================================================================== M2
describe('M2 - Nuevo canal de notificación (0 cambios en alertas.service.ts)', () => {
  class CanalPrueba implements CanalNotificacionStrategy {
    enviados: NotificationPayload[] = [];
    getCanalName() {
      return 'CANAL_PRUEBA';
    }
    async sendNotification(p: NotificationPayload) {
      this.enviados.push(p);
      return true;
    }
  }

  it('M2: un canal nuevo recibe las alertas sin tocar AlertasService', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ...CANALES_NOTIFICACION,
        CanalPrueba,
        { provide: AuditService, useValue: { logEvent: vi.fn().mockResolvedValue({}) } },
        {
          provide: CANALES_NOTIFICACION_TOKEN,
          useFactory: (...c: unknown[]) => c,
          inject: [...CANALES_NOTIFICACION, CanalPrueba], // la única línea nueva
        },
        NotificadorEngineService,
      ],
    }).compile();
    const motor = mod.get(NotificadorEngineService);
    const canal = mod.get(CanalPrueba);

    const Alerta: any = class {
      _id = { toString: () => 'alerta1' };
      constructor(d: any) {
        Object.assign(this, d);
      }
      async save() {
        return this;
      }
      static findOne = vi.fn().mockResolvedValue(null);
    };
    const f = new Date();
    f.setDate(f.getDate() + 3);
    const svc = new AlertasService(
      Alerta,
      {
        find: () => ({
          exec: async () => [
            {
              _id: 'i',
              serial: 'S',
              marca: 'M',
              modelo: 'X',
              estado: EstadoInstrumento.VIGENTE,
              fechaProximaCalibracion: f,
              save: vi.fn(),
            },
          ],
        }),
      } as any,
      motor,
      { logEvent: vi.fn() } as any,
    );
    const r = await svc.scanAlertas();
    expect(canal.enviados).toHaveLength(1);
    expect(r.alertas[0].canalesNotificados).toContain('CANAL_PRUEBA');
  });

  it('M2: alertas.service.ts no conoce ningún canal concreto (queda sin cambios al añadir uno)', () => {
    const src = read('../src/modules/alertas/alertas.service.ts');
    expect(src).not.toMatch(/strategies\/|EmailNotificador|SistemaNotificador|AuditLogNotificador|CanalNotificacionStrategy/);
    expect(read('../src/modules/alertas/notificador-engine.service.ts')).not.toMatch(
      /EmailNotificador|SistemaNotificador|AuditLogNotificador/,
    );
  });
});

// ================================================================== M3
describe('M3 - Cambiar el diseño del PDF queda en un servicio y su prueba', () => {
  it('M3: el diseño del PDF vive solo en pdf-generator.service.ts y se invoca por un único punto', () => {
    const pdf = read('../src/modules/calibraciones/pdf-generator.service.ts');
    expect(pdf).toMatch(/generateCertificadoPdf/);
    // El diseño no depende de servicios de dominio ni de persistencia.
    expect(pdf).not.toMatch(
      /mongoose|InjectModel|calibraciones\.service|instrumentos\.service|AuditService/,
    );
    const svc = read('../src/modules/calibraciones/calibraciones.service.ts');
    expect(svc).not.toMatch(/from 'pdfkit'|from 'qrcode'|doc\.(text|rect|image)\(/);
    const usos = svc.match(/pdfGeneratorService\.\w+/g) ?? [];
    expect(new Set(usos).size).toBeLessThanOrEqual(1);
  });
});
