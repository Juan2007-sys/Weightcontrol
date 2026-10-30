import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { AlertasController } from '../src/modules/alertas/alertas.controller.js';
import { AuditController } from '../src/modules/audit/audit.controller.js';
import { AuthController } from '../src/modules/auth/auth.controller.js';
import { CalibracionesController } from '../src/modules/calibraciones/calibraciones.controller.js';
import { ConfiguracionController } from '../src/modules/configuracion/configuracion.controller.js';
import { InstrumentosController } from '../src/modules/instrumentos/instrumentos.controller.js';
import { UsuariosController } from '../src/modules/usuarios/usuarios.controller.js';
import { AlertasService } from '../src/modules/alertas/alertas.service.js';
import { ConfiguracionService } from '../src/modules/configuracion/configuracion.service.js';
import { ValidationEngineService } from '../src/modules/instrumentos/validators/validation-engine.service.js';
import { RolUsuario } from '../src/schemas/usuario.schema.js';
import { EstadoInstrumento, NivelAlerta } from '../src/schemas/index.js';

/* ------------------------------------------------------------------------------------------------
   S1 - Acceso fuera de rol: TODOS los endpoints con @Roles rechazan los roles no permitidos (403),
   sin importar el controlador. Se recorren por reflexion, de modo que un endpoint nuevo queda
   cubierto automaticamente.
   ------------------------------------------------------------------------------------------------ */
describe('S1 - Todos los endpoints con @Roles rechazan los roles no permitidos', () => {
  const controllers = [
    AlertasController,
    AuditController,
    AuthController,
    CalibracionesController,
    ConfiguracionController,
    InstrumentosController,
    UsuariosController,
  ];
  const reflector = new Reflector();

  const endpoints = controllers.flatMap((ctrl) => {
    const proto = ctrl.prototype as unknown as Record<string, unknown>;
    return Object.getOwnPropertyNames(proto)
      .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
      .map((name) => ({
        ctrl,
        name,
        handler: proto[name] as (...a: unknown[]) => unknown,
      }))
      .map((e) => ({
        ...e,
        roles: reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [e.handler, e.ctrl]) ?? [],
      }))
      .filter((e) => e.roles.length > 0);
  });

  const contexto = (e: (typeof endpoints)[number], rol: RolUsuario) =>
    ({
      getHandler: () => e.handler,
      getClass: () => e.ctrl,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'u1', rol, email: 'x@y.co' },
          method: 'POST',
          originalUrl: `/api/${e.name}`,
          headers: {},
          ip: '127.0.0.1',
        }),
      }),
    }) as unknown as ExecutionContext;

  it('recorre al menos 22 endpoints protegidos con @Roles', () => {
    expect(endpoints.length).toBeGreaterThanOrEqual(22);
  });

  it('cada endpoint: los roles no permitidos reciben 403 y los permitidos pasan (100 %)', async () => {
    const audit = { logEvent: vi.fn().mockResolvedValue(null) };
    const guard = new RolesGuard(reflector, audit as unknown as AuditService);
    const todos = Object.values(RolUsuario);
    let denegados = 0;

    for (const e of endpoints) {
      for (const rol of todos) {
        const permitido = e.roles.includes(rol);
        const resultado = guard.canActivate(contexto(e, rol));
        if (permitido) {
          await expect(resultado, `${e.ctrl.name}.${e.name} con ${rol}`).resolves.toBe(true);
        } else {
          await expect(resultado, `${e.ctrl.name}.${e.name} con ${rol}`).rejects.toThrow(ForbiddenException);
          denegados++;
        }
      }
    }
    // Cada rechazo deja una entrada de auditoria (100 %).
    expect(audit.logEvent).toHaveBeenCalledTimes(denegados);
    expect(denegados).toBeGreaterThan(0);
  });

  it('el rol Auditor no puede registrar instrumentos ni modificar usuarios', async () => {
    const guard = new RolesGuard(reflector);
    const post = endpoints.find((e) => e.ctrl === InstrumentosController && e.name === 'create')!;
    const patch = endpoints.find((e) => e.ctrl === UsuariosController && e.name === 'update')!;
    await expect(guard.canActivate(contexto(post, RolUsuario.AUDITOR))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(contexto(patch, RolUsuario.AUDITOR))).rejects.toThrow(ForbiddenException);
  });
});

/* ------------------------------------------------------------------------------------------------
   C4 - Tipo de instrumento sin validator: se rechaza con 400 y "tipo de instrumento no soportado".
   ------------------------------------------------------------------------------------------------ */
describe('C4 - Tipo de instrumento sin validator', () => {
  const engine = new ValidationEngineService([]);
  const data: any = { tipo: 'Termometro', serial: 'T-1' };

  it('validate() lo marca invalido con el mensaje "no soportado"', () => {
    const r = engine.validate(data);
    expect(r.isValid).toBe(false);
    expect(r.errors[0]).toMatch(/no soportado/i);
  });

  it('assertValid() lanza 400 y nunca aprueba el tipo', () => {
    expect(() => engine.assertValid(data)).toThrow(BadRequestException);
  });
});

/* ------------------------------------------------------------------------------------------------
   M3 - Cambio del umbral de alerta (30 -> 45) sin tocar codigo ni redesplegar.
   ------------------------------------------------------------------------------------------------ */
describe('M3 - Umbral de alerta configurable en caliente', () => {
  function build() {
    let guardado: { valor: number } | null = null;
    const configModel: any = {
      findOne: () => ({ lean: () => ({ exec: () => Promise.resolve(guardado) }) }),
      findOneAndUpdate: (_f: unknown, upd: any) => {
        guardado = { valor: upd.$set.valor };
        return { exec: () => Promise.resolve(guardado) };
      },
    };
    const audit = { logEvent: vi.fn().mockResolvedValue(null) };
    const config = new ConfiguracionService(configModel, audit as unknown as AuditService);

    const dentro40Dias = new Date();
    dentro40Dias.setDate(dentro40Dias.getDate() + 40);
    const inst: any = {
      _id: 'i1',
      serial: 'BASC-040',
      marca: 'M',
      modelo: 'X',
      estado: EstadoInstrumento.VIGENTE,
      fechaProximaCalibracion: dentro40Dias,
      save: vi.fn().mockResolvedValue(true),
    };
    const dispatch = vi.fn().mockResolvedValue(['SISTEMA']);
    const alertaModel: any = function (this: any, dto: any) {
      Object.assign(this, dto);
      this._id = 'a1';
      this.save = vi.fn().mockResolvedValue(this);
      this.toObject = () => ({ ...this });
    };
    alertaModel.findOne = vi.fn().mockResolvedValue(null);
    const instrumentoModel: any = { find: vi.fn().mockReturnValue({ exec: () => Promise.resolve([inst]) }) };
    const alertas = new AlertasService(
      alertaModel,
      instrumentoModel,
      { dispatch } as any,
      audit as unknown as AuditService,
      config,
    );
    return { config, alertas, inst, dispatch, audit, instrumentoModel };
  }

  it('con el umbral por defecto (30) un equipo a 40 dias NO genera alerta', async () => {
    const { alertas, inst, dispatch } = build();
    const r = await alertas.scanAlertas();
    expect(r.alertasGeneradas).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
    expect(inst.estado).toBe(EstadoInstrumento.VIGENTE);
  });

  it('tras cambiar el umbral a 45 el SIGUIENTE escaneo lo alerta y pasa a Por vencer (sin tocar codigo)', async () => {
    const { config, alertas, inst, dispatch, audit } = build();
    await config.setUmbralDias(45, 'admin1', '127.0.0.1', 'test');

    const r = await alertas.scanAlertas();

    expect(r.alertasGeneradas).toBe(1);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ nivelCriticidad: NivelAlerta.PREVENTIVA }));
    expect(inst.estado).toBe(EstadoInstrumento.POR_VENCER);
    expect(audit.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityAffected: 'Configuracion', userId: 'admin1' }),
    );
  });

  it('el estado calculado al registrar tambien usa el umbral vigente', async () => {
    const { config } = build();
    await config.setUmbralDias(45, 'admin1');
    expect(config.umbralDiasCache).toBe(45);
  });

  it('rechaza umbrales invalidos (no entero, 0, negativo, > 365)', async () => {
    const { config } = build();
    for (const v of [0, -3, 1.5, 366, Number.NaN]) {
      await expect(config.setUmbralDias(v, 'admin1')).rejects.toThrow(BadRequestException);
    }
  });

  it('los equipos inactivos no se escanean (HU-08)', async () => {
    const { alertas, instrumentoModel } = build();
    await alertas.scanAlertas();
    expect(instrumentoModel.find).toHaveBeenCalledWith({ activo: { $ne: false } });
  });

  it('solo el Administrador puede cambiar el umbral (PUT /configuracion/alertas)', () => {
    const reflector = new Reflector();
    const roles = reflector.get<RolUsuario[]>(ROLES_KEY, ConfiguracionController.prototype.setAlertas);
    expect(roles).toEqual([RolUsuario.ADMIN]);
  });
});

/* Habeas Data: los campos internos de HU-08/HU-09 nunca salen en el listado sin sesion. */
describe('Listado publico: no expone datos de inactivacion ni de carga de evidencias', () => {
  it('toPublicListItem elimina inactivadoPor, motivoInactivacion y evidenciasMeta', async () => {
    const { toPublicListItem } = await import('../src/modules/instrumentos/dto/public-list-item.js');
    const item: any = {
      id: '1',
      serial: 'S-1',
      activo: false,
      inactivadoPor: { nombre: 'Admin', email: 'admin@x.co' },
      motivoInactivacion: 'baja',
      fechaInactivacion: new Date(),
      evidenciasMeta: { fotoEquipo: { cargadoPor: 'u1' } },
      propietario: { nitRut: '1' },
    };
    const publico: any = toPublicListItem(item);
    for (const k of ['inactivadoPor', 'motivoInactivacion', 'fechaInactivacion', 'evidenciasMeta', 'propietario']) {
      expect(publico).not.toHaveProperty(k);
    }
    expect(publico.serial).toBe('S-1');
  });
});
