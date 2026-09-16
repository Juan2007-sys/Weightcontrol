import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { AuditService } from '../audit/audit.service.js';
import { Usuario, RolUsuario } from '../../schemas/usuario.schema.js';

vi.mock('bcrypt', () => {
  const hash = vi.fn().mockResolvedValue('hashedPassword123');
  const compare = vi.fn().mockResolvedValue(true);
  return {
    hash,
    compare,
    default: {
      hash,
      compare,
    },
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockAuditService: any;

  const mockUserDoc = {
    _id: '60d0fe4f5311236168a109ca',
    nombre: 'Carlos Perez',
    email: 'carlos@example.com',
    password: 'hashedPassword123',
    rol: RolUsuario.TECNICO,
    activo: true,
    save: vi.fn(),
  };

  class MockUsuarioModel {
    _id = '60d0fe4f5311236168a109ca';
    save = vi.fn().mockResolvedValue(this);
    constructor(dto: any) {
      Object.assign(this, dto);
      this._id = '60d0fe4f5311236168a109ca';
      this.save = vi.fn().mockResolvedValue(this);
    }
    static findOne = vi.fn();
    static findById = vi.fn();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    (bcrypt.hash as any).mockResolvedValue('hashedPassword123');
    (bcrypt.compare as any).mockResolvedValue(true);

    MockUsuarioModel.findOne = vi.fn();
    MockUsuarioModel.findById = vi.fn();

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock_jwt_token_xyz'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_EXPIRES_IN') return '1h';
        return null;
      }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(Usuario.name),
          useValue: MockUsuarioModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('debe registrar un usuario exitosamente y retornar token con datos', async () => {
      MockUsuarioModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashedPassword123');

      const registerDto = {
        nombre: 'Carlos Perez',
        email: 'carlos@example.com',
        password: 'password123',
        rol: RolUsuario.TECNICO,
      };

      const result = await service.register(registerDto, '127.0.0.1', 'Vitest-Agent');

      expect(result).toHaveProperty('accessToken', 'mock_jwt_token_xyz');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result.user).toHaveProperty('email', 'carlos@example.com');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      MockUsuarioModel.findOne.mockResolvedValue(mockUserDoc);

      const registerDto = {
        nombre: 'Carlos Perez',
        email: 'carlos@example.com',
        password: 'password123',
      };

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('debe iniciar sesión exitosamente con credenciales válidas', async () => {
      const selectMock = vi.fn().mockResolvedValue(mockUserDoc);
      MockUsuarioModel.findOne.mockReturnValue({ select: selectMock });
      (bcrypt.compare as any).mockResolvedValue(true);

      const loginDto = {
        email: 'carlos@example.com',
        password: 'password123',
      };

      const result = await service.login(loginDto, '127.0.0.1', 'Vitest-Agent');

      expect(result).toHaveProperty('accessToken', 'mock_jwt_token_xyz');
      expect(result.user).toHaveProperty('id', '60d0fe4f5311236168a109ca');
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      const selectMock = vi.fn().mockResolvedValue(null);
      MockUsuarioModel.findOne.mockReturnValue({ select: selectMock });

      const loginDto = {
        email: 'desconocido@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el usuario está inactivo', async () => {
      const inactiveUser = { ...mockUserDoc, activo: false };
      const selectMock = vi.fn().mockResolvedValue(inactiveUser);
      MockUsuarioModel.findOne.mockReturnValue({ select: selectMock });

      const loginDto = {
        email: 'inactivo@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      const selectMock = vi.fn().mockResolvedValue(mockUserDoc);
      MockUsuarioModel.findOne.mockReturnValue({ select: selectMock });
      (bcrypt.compare as any).mockResolvedValue(false);

      const loginDto = {
        email: 'carlos@example.com',
        password: 'wrong_password',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('debe retornar el perfil del usuario sanitizado', async () => {
      MockUsuarioModel.findById.mockResolvedValue(mockUserDoc);

      const profile = await service.getProfile('60d0fe4f5311236168a109ca');

      expect(profile).toHaveProperty('email', 'carlos@example.com');
      expect(profile).not.toHaveProperty('password');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      MockUsuarioModel.findById.mockResolvedValue(null);

      await expect(service.getProfile('non_existent_id')).rejects.toThrow(NotFoundException);
    });
  });
});
