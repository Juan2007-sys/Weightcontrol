import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';
import { TipoAccionAuditoria, EntidadAfectada } from '../../schemas/trazabilidad-evento.schema.js';

describe('RolesGuard (RBAC & Auditoría ISO 27001)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockAuditService: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };
    guard = new RolesGuard(reflector, mockAuditService);
  });

  function createMockExecutionContext(user: any, requestMetadata?: { method?: string; url?: string; ip?: string }): ExecutionContext {
    const req = {
      user,
      method: requestMetadata?.method || 'POST',
      originalUrl: requestMetadata?.url || '/api/instrumentos',
      ip: requestMetadata?.ip || '192.168.1.100',
      headers: { 'user-agent': 'Mozilla/5.0 TestBrowser' },
      socket: { remoteAddress: '192.168.1.100' },
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  it('debe permitir acceso si la ruta no tiene roles requeridos definidos', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext(null);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuditService.logEvent).not.toHaveBeenCalled();
  });

  it('debe permitir acceso si el usuario cuenta con el rol requerido (ADMIN)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);
    const context = createMockExecutionContext({
      id: 'admin_123',
      email: 'admin@weightcontrol.gov.co',
      rol: RolUsuario.ADMIN,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuditService.logEvent).not.toHaveBeenCalled();
  });

  it('debe permitir acceso si el usuario cuenta con uno de los roles permitidos (TECNICO)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN, RolUsuario.TECNICO]);
    const context = createMockExecutionContext({
      id: 'tech_456',
      email: 'tecnico@onac.org',
      rol: RolUsuario.TECNICO,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockAuditService.logEvent).not.toHaveBeenCalled();
  });

  it('HU-03: debe rechazar con HTTP 403 Forbidden y registrar auditoría si usuario no tiene rol autorizado', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);
    const context = createMockExecutionContext(
      {
        id: 'auditor_789',
        email: 'auditor@sic.gov.co',
        rol: RolUsuario.AUDITOR,
      },
      { method: 'DELETE', url: '/api/instrumentos/inst_99', ip: '10.0.0.50' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

    // Verificación de bitácora de trazabilidad ISO/IEC 27001
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'auditor_789',
        userRole: RolUsuario.AUDITOR,
        actionType: TipoAccionAuditoria.AUTH_FAILURE,
        entityAffected: EntidadAfectada.USUARIO,
        identifier: 'auditor@sic.gov.co',
        ipAddress: '10.0.0.50',
        descripcion: expect.stringContaining('Acceso denegado (HTTP 403)'),
      }),
    );
  });

  it('HU-03: debe rechazar con HTTP 403 Forbidden y registrar auditoría si usuario es anónimo o sin rol', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN, RolUsuario.TECNICO]);
    const context = createMockExecutionContext(
      null,
      { method: 'POST', url: '/api/calibraciones', ip: '186.28.10.5' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: 'ANONYMOUS',
        actionType: TipoAccionAuditoria.AUTH_FAILURE,
        entityAffected: EntidadAfectada.USUARIO,
        ipAddress: '186.28.10.5',
      }),
    );
  });
});
