import { Test } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy.js';
import { Usuario } from '../src/schemas/usuario.schema.js';
import { InstrumentosController } from '../src/modules/instrumentos/instrumentos.controller.js';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import { Public } from '../src/common/decorators/public.decorator.js';
import { CurrentUser } from '../src/common/decorators/current-user.decorator.js';
import {
  EstadoInstrumento,
  TipoInstrumento,
  CategoriaExactitud,
  UnidadMedida,
} from '../src/schemas/instrumento.schema.js';

const SECRET = 'secreto-test-f1';
const configStub = { get: (k: string) => (k === 'JWT_SECRET' ? SECRET : undefined) };

const completo = {
  id: '1',
  serial: 'SER-1',
  marca: 'Torrey',
  modelo: 'X',
  tipo: TipoInstrumento.BASCULA,
  categoriaExactitud: CategoriaExactitud.CLASE_III,
  capacidadMaxima: 30,
  capacidadMinima: 0.1,
  unidadMedida: UnidadMedida.KG,
  divisionEscala: 0.005,
  codigoPrecintoSIMEL: 'P-1',
  propietario: { nombreRazonSocial: 'ACME SAS', nitRut: '900', direccion: 'Calle 1', ciudad: 'Cali' },
  evidenciasFotograficas: { fotoEquipo: 'data:image/png;base64,AAAA' },
  ubicacionFisica: 'Bodega privada',
  fechaUltimaCalibracion: new Date('2026-01-01'),
  fechaProximaCalibracion: new Date('2027-01-01'),
  estado: EstadoInstrumento.VIGENTE,
  creadoPor: { nombre: 'Tec', email: 'tec@x.com', rol: 'TECNICO' },
  actualizadoPor: { nombre: 'Tec', email: 'tec@x.com', rol: 'TECNICO' },
};

const usuarioActivo = { _id: 'u1', nombre: 'Tec', email: 't@x.com', rol: 'TECNICO', activo: true };

describe('F1 - listado publico sin datos sensibles; con sesion completo', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const instrumentosService = { findAll: vi.fn(), getStats: vi.fn() };
  const usuarioModel = { findById: vi.fn() };

  beforeEach(async () => {
    usuarioModel.findById.mockReset();
    usuarioModel.findById.mockReturnValue({ lean: () => Promise.resolve(usuarioActivo) });
    instrumentosService.findAll.mockReset();
    instrumentosService.findAll.mockResolvedValue({
      data: [structuredClone(completo)],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: SECRET })],
      controllers: [InstrumentosController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: configStub },
        { provide: InstrumentosService, useValue: instrumentosService },
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  const sensibles = ['propietario', 'creadoPor', 'actualizadoPor', 'evidenciasFotograficas', 'ubicacionFisica'];

  it('sin token: oculta propietario, creadoPor, evidencias y ubicacion pero conserva lo que usa el frontend', async () => {
    const res = await request(app.getHttpServer()).get('/instrumentos?limit=100').expect(200);
    const item = res.body.data[0];
    for (const campo of sensibles) expect(item).not.toHaveProperty(campo);
    expect(item.serial).toBe('SER-1');
    expect(item.id).toBe('1');
    expect(item.estado).toBe(EstadoInstrumento.VIGENTE);
    expect(item.marca).toBe('Torrey');
    expect(item.codigoPrecintoSIMEL).toBe('P-1');
    expect(res.body.meta.total).toBe(1);
    // el servicio se invoca en modo publico (no permite buscar por datos del propietario)
    expect(instrumentosService.findAll.mock.calls[0][1]).toEqual({ publico: true });
  });

  it('con token invalido: se trata como sin sesion (no 401, sin fuga)', async () => {
    const res = await request(app.getHttpServer())
      .get('/instrumentos')
      .set('Authorization', 'Bearer basura.invalida.token')
      .expect(200);
    for (const campo of sensibles) expect(res.body.data[0]).not.toHaveProperty(campo);
  });

  it('con token valido: devuelve el DTO completo', async () => {
    const token = jwt.sign({ sub: 'u1', email: 't@x.com', rol: 'TECNICO', nombre: 'Tec' });
    const res = await request(app.getHttpServer())
      .get('/instrumentos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const item = res.body.data[0];
    for (const campo of sensibles) expect(item).toHaveProperty(campo);
    expect(item.propietario.nombreRazonSocial).toBe('ACME SAS');
    expect(instrumentosService.findAll.mock.calls[0][1]).toBeUndefined();
  });

  it('token de usuario inactivo: tambien sin datos sensibles', async () => {
    usuarioModel.findById.mockReturnValue({ lean: () => Promise.resolve({ ...usuarioActivo, activo: false }) });
    const token = jwt.sign({ sub: 'u1', email: 't@x.com', rol: 'TECNICO', nombre: 'Tec' });
    const res = await request(app.getHttpServer())
      .get('/instrumentos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data[0]).not.toHaveProperty('propietario');
  });
});

describe('JwtAuthGuard - autenticacion opcional en rutas @Public', () => {
  @Controller('t')
  class TController {
    @Public()
    @Get('pub')
    pub(@CurrentUser('id') id?: string) {
      return { id: id ?? null };
    }
    @Get('priv')
    priv(@CurrentUser('id') id?: string) {
      return { id };
    }
  }

  it('las rutas privadas siguen dando 401 sin token y las publicas adjuntan el usuario si hay token valido', async () => {
    const usuarioModel = {
      findById: () => ({
        lean: () => Promise.resolve({ _id: 'u9', nombre: 'N', email: 'e', rol: 'ADMIN', activo: true }),
      }),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: SECRET })],
      controllers: [TController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: configStub },
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    await app.init();
    const token = moduleRef.get(JwtService).sign({ sub: 'u9', email: 'e', rol: 'ADMIN', nombre: 'N' });

    await request(app.getHttpServer()).get('/t/priv').expect(401);
    await request(app.getHttpServer()).get('/t/priv').set('Authorization', `Bearer ${token}`).expect(200);
    const sin = await request(app.getHttpServer()).get('/t/pub').expect(200);
    expect(sin.body.id).toBeNull();
    const con = await request(app.getHttpServer()).get('/t/pub').set('Authorization', `Bearer ${token}`).expect(200);
    expect(con.body.id).toBe('u9');
    await app.close();
  });
});
