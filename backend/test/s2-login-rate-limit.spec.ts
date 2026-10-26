import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuthController,
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_TTL_MS,
} from '../src/modules/auth/auth.controller.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { TipoAccionAuditoria } from '../src/schemas/trazabilidad-evento.schema.js';

describe('S2 — Límite de intentos de login (fuerza bruta)', () => {
  let app: INestApplication;
  let audit: { logEvent: ReturnType<typeof vi.fn> };
  let authService: { login: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    audit = { logEvent: vi.fn().mockResolvedValue({}) };
    authService = {
      login: vi.fn().mockRejectedValue(new UnauthorizedException('Credenciales inválidas.')),
      register: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const intentar = () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'victima@example.com', password: 'incorrecta' });

  it(`permite ${LOGIN_RATE_LIMIT} intentos fallidos (401) y bloquea el siguiente con 429`, async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      await intentar().expect(401);
    }

    await intentar().expect(429);
  });

  it('F6b: los logins EXITOSOS no consumen el cupo: solo cuentan los fallidos', async () => {
    authService.login.mockResolvedValue({ accessToken: 'tok' });
    for (let i = 0; i < LOGIN_RATE_LIMIT + 3; i++) {
      await intentar().expect(200);
    }

    authService.login.mockRejectedValue(new UnauthorizedException('Credenciales inválidas.'));
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      await intentar().expect(401);
    }
    await intentar().expect(429);
  });

  it('F6b: un login exitoso entre fallidos no reinicia ni suma el contador de fallidos', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT - 1; i++) {
      await intentar().expect(401);
    }
    authService.login.mockResolvedValueOnce({ accessToken: 'tok' });
    await intentar().expect(200);
    await intentar().expect(401); // 5.º fallido
    await intentar().expect(429); // 6.º fallido en la ventana
  });

  it('F6b: ráfaga concurrente de fallidos tampoco supera el límite', async () => {
    const resultados = await Promise.all(
      Array.from({ length: LOGIN_RATE_LIMIT + 3 }, () => intentar()),
    );
    const codigos = resultados.map((r) => r.status);
    expect(codigos.filter((c) => c === 401)).toHaveLength(LOGIN_RATE_LIMIT);
    expect(codigos.filter((c) => c === 429)).toHaveLength(3);
  });

  it('los intentos bloqueados no llegan al servicio de autenticación', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT + 3; i++) {
      await intentar();
    }

    expect(authService.login).toHaveBeenCalledTimes(LOGIN_RATE_LIMIT);
  });

  it('el límite aplica solo al login, no a otras rutas del controlador', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT + 2; i++) {
      await intentar();
    }

    for (let i = 0; i < LOGIN_RATE_LIMIT + 2; i++) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ nombre: 'Test', email: `t${i}@example.com`, password: 'Password123!' })
        .expect(201);
    }
  });

  it('cada 429 se audita como AUTH_FAILURE con IP y correo objetivo (y los 401 previos no lo hacen en el guard)', async () => {
    for (let i = 0; i < LOGIN_RATE_LIMIT; i++) {
      await intentar().expect(401);
    }
    expect(audit.logEvent).not.toHaveBeenCalled();

    await intentar().expect(429);
    await intentar().expect(429);

    expect(audit.logEvent).toHaveBeenCalledTimes(2);
    const evento = audit.logEvent.mock.calls[0][0];
    expect(evento.actionType).toBe(TipoAccionAuditoria.AUTH_FAILURE);
    expect(evento.identifier).toBe('victima@example.com');
    expect(evento.ipAddress).toBeTruthy();
    expect(evento.descripcion).toContain('429');
  });

  it('el límite es de 5 intentos por minuto: el 6.º es el primero bloqueado', () => {
    expect(LOGIN_RATE_LIMIT).toBe(5);
    expect(LOGIN_RATE_TTL_MS).toBe(60_000);
  });
});
