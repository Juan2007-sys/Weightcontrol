import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolUsuario, UsuarioDocument } from '../src/schemas/usuario.schema.js';
import * as bcrypt from 'bcrypt';

describe('🟢 RF003 & RF004 — Gestión de Usuarios y Control de Acceso RBAC', () => {
  let authService: AuthService;
  let mockUsuarioModel: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt_mock_token_12345'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'secret';
        if (key === 'JWT_EXPIRES_IN') return '24h';
        return null;
      }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    mockUsuarioModel = class {
      _id = 'user_id_001';
      nombre = 'Carlos Gómez';
      email = 'carlos@metrologia.gov.co';
      rol = RolUsuario.TECNICO;
      activo = true;
      password = 'hashed_password';
      save = vi.fn().mockResolvedValue(this);
      toObject = vi.fn().mockImplementation(function (this: any) {
        return { ...this };
      });
      constructor(dto: any) {
        Object.assign(this, dto);
      }
      static findOne = vi.fn();
      static findById = vi.fn();
    };

    authService = new AuthService(
      mockUsuarioModel as any,
      mockJwtService,
      mockConfigService,
      mockAuditService,
    );
  });

  // ==========================================
  // RF003: GESTIÓN DE USUARIOS
  // ==========================================
  describe('RF003 — Gestión y Ciclo de Vida de Usuarios', () => {
    it('TC-RF003-01: Registro exitoso de usuario técnico con contraseña cifrada', async () => {
      mockUsuarioModel.findOne = vi.fn().mockResolvedValue(null);

      const registerDto = {
        nombre: 'Carlos Gómez',
        email: 'carlos@metrologia.gov.co',
        password: 'Password123!',
        rol: RolUsuario.TECNICO,
        documentoIdentidad: '1020304050',
        numeroRegistroSIMEL: 'SIMEL-TEC-001',
      };

      const result = await authService.register(registerDto as any);
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('carlos@metrologia.gov.co');
      expect(result.user.rol).toBe(RolUsuario.TECNICO);
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('TC-RF003-02: Intento de registro con email duplicado debe lanzar ConflictException (409)', async () => {
      mockUsuarioModel.findOne = vi.fn().mockResolvedValue({ email: 'carlos@metrologia.gov.co' });

      const duplicateDto = {
        nombre: 'Carlos Gómez Duplicado',
        email: 'carlos@metrologia.gov.co',
        password: 'Password123!',
        rol: RolUsuario.TECNICO,
      };

      await expect(authService.register(duplicateDto as any)).rejects.toThrow(ConflictException);
    });

    it('TC-RF003-03: Bloqueo de inicio de sesión para usuarios inactivos / desactivados', async () => {
      mockUsuarioModel.findOne = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'user_inactivo',
          email: 'inactivo@metrologia.gov.co',
          activo: false, // Desactivado
          rol: RolUsuario.TECNICO,
        }),
      });

      const loginDto = {
        email: 'inactivo@metrologia.gov.co',
        password: 'Password123!',
      };

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'AUTH_FAILURE',
        }),
      );
    });
  });

  // ==========================================
  // RF004: GESTIÓN DE ROLES Y RBAC
  // ==========================================
  describe('RF004 — Control de Acceso Basado en Roles (RBAC)', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    it('TC-RF004-01: Permitir acceso a ADMIN en endpoint protegido para ADMIN', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'admin_1', rol: RolUsuario.ADMIN },
          }),
        }),
      } as any;

      const canActivate = rolesGuard.canActivate(mockExecutionContext);
      expect(canActivate).toBe(true);
    });

    it('TC-RF004-02: Denegar acceso (Forbidden) a AUDITOR o CIUDADANO en endpoint de creación', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        RolUsuario.ADMIN,
        RolUsuario.TECNICO,
      ]);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'auditor_1', rol: RolUsuario.AUDITOR },
          }),
        }),
      } as any;

      expect(() => rolesGuard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('TC-RF004-03: Endpoint sin restricción de roles permite acceso a cualquier usuario autenticado', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'user_1', rol: RolUsuario.CIUDADANO },
          }),
        }),
      } as any;

      const canActivate = rolesGuard.canActivate(mockExecutionContext);
      expect(canActivate).toBe(true);
    });
  });
});
