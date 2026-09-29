import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { RolUsuario } from '../src/schemas/usuario.schema.js';
import { TipoAccionAuditoria, EntidadAfectada } from '../src/schemas/trazabilidad-evento.schema.js';
import * as bcrypt from 'bcrypt';

describe('🟢 RF003 & RF004 — Gestión de Usuarios, RBAC y Auditoría 403', () => {
  let authService: AuthService;
  let usuariosService: UsuariosService;
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
      logEvent: vi.fn().mockResolvedValue({ _id: 'audit_log_1' }),
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
      static find = vi.fn();
      static countDocuments = vi.fn();
      static findByIdAndDelete = vi.fn();
    };

    authService = new AuthService(
      mockUsuarioModel as any,
      mockJwtService,
      mockConfigService,
      mockAuditService,
    );

    usuariosService = new UsuariosService(
      mockUsuarioModel as any,
      mockAuditService,
    );
  });

  // =========================================================================
  // RF003: GESTIÓN Y CICLO DE VIDA DE USUARIOS (CREAR, EDITAR, INACTIVAR)
  // =========================================================================
  describe('RF003 — Gestión y Ciclo de Vida de Usuarios por Administrador', () => {
    it('TC-RF003-01: El Administrador crea exitosamente un usuario técnico con contraseña cifrada y traza', async () => {
      mockUsuarioModel.findOne = vi.fn().mockResolvedValue(null);

      const createDto = {
        nombre: 'Ingeniero Metrólogo',
        email: 'tecnico.nuevo@metrologia.gov.co',
        password: 'PasswordSeguro123!',
        rol: RolUsuario.TECNICO,
        documentoIdentidad: '1098765432',
        numeroRegistroSIMEL: 'SIMEL-TEC-99',
      };

      const result = await usuariosService.create(
        createDto as any,
        'admin_super_user',
        '192.168.1.100',
        'Mozilla/5.0',
      );

      expect(result).toBeDefined();
      expect(result.email).toBe('tecnico.nuevo@metrologia.gov.co');
      expect(result.rol).toBe(RolUsuario.TECNICO);
      expect(result.activo).toBe(true);

      // Verificación de traza de auditoría
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.CREATE,
          entityAffected: EntidadAfectada.USUARIO,
          userId: 'admin_super_user',
        }),
      );
    });

    it('TC-RF003-02: Intento de crear usuario con email duplicado debe lanzar ConflictException (409)', async () => {
      mockUsuarioModel.findOne = vi.fn().mockResolvedValue({
        _id: 'user_existente',
        email: 'duplicado@metrologia.gov.co',
      });

      const createDto = {
        nombre: 'Usuario Repetido',
        email: 'duplicado@metrologia.gov.co',
        password: 'PasswordSeguro123!',
        rol: RolUsuario.AUDITOR,
      };

      await expect(
        usuariosService.create(createDto as any, 'admin_super_user'),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-RF003-03: El Administrador edita los datos de un usuario y se registra en la traza', async () => {
      const mockExistingUser = new mockUsuarioModel({
        _id: 'user_a_editar',
        nombre: 'Nombre Anterior',
        email: 'original@metrologia.gov.co',
        rol: RolUsuario.TECNICO,
        activo: true,
      });

      mockUsuarioModel.findById = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockExistingUser),
      });
      mockUsuarioModel.findOne = vi.fn().mockResolvedValue(null);

      const updateDto = {
        nombre: 'Nombre Actualizado',
        rol: RolUsuario.AUDITOR,
        telefono: '3001234567',
      };

      const result = await usuariosService.update(
        'user_a_editar',
        updateDto,
        'admin_super_user',
        '10.0.0.1',
        'Chrome/120',
      );

      expect(result.nombre).toBe('Nombre Actualizado');
      expect(result.rol).toBe(RolUsuario.AUDITOR);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.UPDATE,
          entityAffected: EntidadAfectada.USUARIO,
          identifier: 'user_a_editar',
        }),
      );
    });

    it('TC-RF003-04: El Administrador inactiva un usuario y queda registrado en la traza forense (STATUS_CHANGE)', async () => {
      const mockUserToDeactivate = new mockUsuarioModel({
        _id: 'user_target_01',
        nombre: 'Técnico Saliente',
        email: 'saliente@metrologia.gov.co',
        rol: RolUsuario.TECNICO,
        activo: true,
      });

      mockUsuarioModel.findById = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockUserToDeactivate),
      });

      const result = await usuariosService.changeStatus(
        'user_target_01',
        { activo: false, motivo: 'Fin de contrato laboral' },
        'admin_super_user',
        '192.168.1.5',
      );

      expect(result.activo).toBe(false);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.STATUS_CHANGE,
          entityAffected: EntidadAfectada.USUARIO,
          identifier: 'user_target_01',
          previousState: { activo: true },
          newState: { activo: false },
        }),
      );
    });

    it('TC-RF003-05: El Administrador reactiva un usuario inactivo', async () => {
      const mockUserToActivate = new mockUsuarioModel({
        _id: 'user_target_02',
        nombre: 'Técnico Reincorporado',
        email: 'reincorporado@metrologia.gov.co',
        rol: RolUsuario.TECNICO,
        activo: false,
      });

      mockUsuarioModel.findById = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockUserToActivate),
      });

      const result = await usuariosService.changeStatus(
        'user_target_02',
        { activo: true, motivo: 'Reactivación de credenciales' },
        'admin_super_user',
      );

      expect(result.activo).toBe(true);
    });

    it('TC-RF003-06: El Administrador no puede inactivar su propia cuenta (protección de auto-bloqueo)', async () => {
      const mockAdminUser = new mockUsuarioModel({
        _id: 'admin_123',
        email: 'admin@metrologia.gov.co',
        rol: RolUsuario.ADMIN,
        activo: true,
      });

      mockUsuarioModel.findById = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockAdminUser),
      });

      await expect(
        usuariosService.changeStatus(
          'admin_123',
          { activo: false },
          'admin_123', // Mismo ID del admin que ejecuta la petición
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-RF003-07: Bloqueo de inicio de sesión para usuarios inactivos con registro de auditoría AUTH_FAILURE', async () => {
      mockUsuarioModel.findOne = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'user_inactivo_99',
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
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          entityAffected: EntidadAfectada.USUARIO,
        }),
      );
    });
  });

  // =========================================================================
  // RF004: GESTIÓN DE ROLES, RBAC Y AUDITORÍA DE ACCESOS DENEGADOS (403)
  // =========================================================================
  describe('RF004 — Control de Acceso Basado en Roles (RBAC) y Auditoría de 403', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector, mockAuditService);
    });

    it('TC-RF004-01: Permitir acceso a ADMIN en endpoint protegido exclusivamente para ADMIN', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'admin_1', email: 'admin@gov.co', rol: RolUsuario.ADMIN },
            method: 'POST',
            url: '/api/usuarios',
          }),
        }),
      } as any;

      const canActivate = await rolesGuard.canActivate(mockExecutionContext);
      expect(canActivate).toBe(true);
      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('TC-RF004-02: Denegar acceso (403 Forbidden) a TECNICO en endpoint exclusivo de ADMIN y registrar traza inmutable', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'tec_1', email: 'tecnico@gov.co', rol: RolUsuario.TECNICO },
            method: 'POST',
            url: '/api/usuarios',
            ip: '192.168.1.45',
            headers: { 'user-agent': 'Mozilla/5.0 Test' },
          }),
        }),
      } as any;

      await expect(rolesGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );

      // Verificación de registro inmutable en la traza de auditoría
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          entityAffected: EntidadAfectada.USUARIO,
          userRole: RolUsuario.TECNICO,
          identifier: 'tecnico@gov.co',
          descripcion: expect.stringContaining('HTTP 403'),
        }),
      );
    });

    it('TC-RF004-03: Denegar acceso (403 Forbidden) a AUDITOR en endpoint de creación de instrumentos y registrar en traza', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        RolUsuario.ADMIN,
        RolUsuario.TECNICO,
      ]);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'auditor_1', email: 'auditor@sic.gov.co', rol: RolUsuario.AUDITOR },
            method: 'POST',
            url: '/api/instrumentos',
            ip: '10.0.0.5',
            headers: { 'user-agent': 'PostmanRuntime/7.36' },
          }),
        }),
      } as any;

      await expect(rolesGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          userRole: RolUsuario.AUDITOR,
          identifier: 'auditor@sic.gov.co',
        }),
      );
    });

    it('TC-RF004-04: Usuario no autenticado o sin rol recibe 403 y se registra en la traza de auditoría', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RolUsuario.ADMIN]);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: null, // Sin usuario autenticado
            method: 'DELETE',
            url: '/api/instrumentos/inst_123',
            ip: '185.220.101.5',
          }),
        }),
      } as any;

      await expect(rolesGuard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          entityAffected: EntidadAfectada.USUARIO,
        }),
      );
    });

    it('TC-RF004-05: Endpoint público o sin restricción de roles permite acceso inmediato', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const mockExecutionContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({
            user: { id: 'ciudadano_1', rol: RolUsuario.CIUDADANO },
          }),
        }),
      } as any;

      const canActivate = await rolesGuard.canActivate(mockExecutionContext);
      expect(canActivate).toBe(true);
      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });
  });
});
