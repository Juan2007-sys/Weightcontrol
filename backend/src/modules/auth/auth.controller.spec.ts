import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  const mockAuthResponse = {
    accessToken: 'mock_jwt_token',
    tokenType: 'Bearer',
    expiresIn: '24h',
    user: {
      id: '60d0fe4f5311236168a109ca',
      nombre: 'Juan Perez',
      email: 'juan@example.com',
      rol: RolUsuario.ADMIN,
      activo: true,
    },
  };

  beforeEach(async () => {
    mockAuthService = {
      register: vi.fn().mockResolvedValue(mockAuthResponse),
      login: vi.fn().mockResolvedValue(mockAuthResponse),
      getProfile: vi.fn().mockResolvedValue(mockAuthResponse.user),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('debe registrar un nuevo usuario', async () => {
    const registerDto = {
      nombre: 'Juan Perez',
      email: 'juan@example.com',
      password: 'password123',
    };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.register(registerDto, req);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(registerDto, '127.0.0.1', 'Vitest');
  });

  it('debe iniciar sesión', async () => {
    const loginDto = {
      email: 'juan@example.com',
      password: 'password123',
    };
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'Vitest' }, socket: {} } as any;

    const result = await controller.login(loginDto, req);

    expect(result).toEqual(mockAuthResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'Vitest');
  });

  it('debe obtener el perfil del usuario autenticado (/profile y /me)', async () => {
    const profile = await controller.getProfile('60d0fe4f5311236168a109ca');
    expect(profile).toEqual(mockAuthResponse.user);

    const me = await controller.getMe('60d0fe4f5311236168a109ca');
    expect(me).toEqual(mockAuthResponse.user);
  });
});
