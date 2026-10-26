import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuditController } from '../src/modules/audit/audit.controller.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

/** F3: GET /api/audit respondia 400 porque QueryAuditDto no tenia decoradores (whitelist + forbidNonWhitelisted). */
describe('F3 — GET /audit con el ValidationPipe real de main.ts', () => {
  let app: INestApplication;
  const auditService = {
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 }),
    getRecentSecurityEvents: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
  };

  beforeEach(async () => {
    auditService.findAll.mockClear();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    // Misma configuracion que backend/src/main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde 200 sin parametros', async () => {
    await request(app.getHttpServer()).get('/audit').expect(200);
    expect(auditService.findAll).toHaveBeenCalledTimes(1);
  });

  it('acepta los filtros que usa el frontend y los entrega tipados', async () => {
    await request(app.getHttpServer())
      .get('/audit')
      .query({ entityAffected: 'USUARIO', actionType: 'AUTH_FAILURE', search: 'qa', page: 2, limit: 50 })
      .expect(200);
    const q = auditService.findAll.mock.calls[0][0];
    expect(q.page).toBe(2);
    expect(q.limit).toBe(50);
    expect(q.actionType).toBe('AUTH_FAILURE');
    expect(q.entityAffected).toBe('USUARIO');
    expect(q.search).toBe('qa');
  });

  it('acepta userId e identifier (soportados por el controlador)', async () => {
    await request(app.getHttpServer())
      .get('/audit')
      .query({ userId: '60d0fe4f5311236168a109aa', identifier: 'SER-1' })
      .expect(200);
  });

  it('rechaza valores invalidos (limit no numerico, limit fuera de rango) y propiedades desconocidas', async () => {
    await request(app.getHttpServer()).get('/audit').query({ limit: 'abc' }).expect(400);
    await request(app.getHttpServer()).get('/audit').query({ limit: 0 }).expect(400);
    await request(app.getHttpServer()).get('/audit').query({ page: -1 }).expect(400);
    await request(app.getHttpServer()).get('/audit').query({ hack: '1' }).expect(400);
  });

  it('GET /audit/security-events sigue funcionando', async () => {
    await request(app.getHttpServer()).get('/audit/security-events?limit=5').expect(200);
  });
});
