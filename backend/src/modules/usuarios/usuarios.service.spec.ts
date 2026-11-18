import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsuariosService } from './usuarios.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  Usuario,
  RolUsuario,
  Instrumento,
  Calibracion,
  Certificado,
  TrazabilidadEvento,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';

describe('UsuariosService (HU-11 Gestión Avanzada de Usuarios y Roles)', () => {
  let service: UsuariosService;
  let mockUsuarioModel: any;
  let mockInstrumentoModel: any;
  let mockCalibracionModel: any;
  let mockCertificadoModel: any;
  let mockTrazabilidadModel: any;
  let mockAuditService: any;

  const baseUser = {
    _id: 'user-123',
    nombre: 'Carlos Metrólogo',
    email: 'carlos@weightcontrol.co',
    password: '$2b$10$hashedpassword',
    rol: RolUsuario.TECNICO,
    activo: true,
    save: vi.fn(),
  };

  beforeEach(async () => {
    const savedDoc = { ...baseUser };
    savedDoc.save = vi.fn().mockResolvedValue(savedDoc);

    mockUsuarioModel = vi.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        _id: 'user-new-1',
        save: vi.fn().mockResolvedValue({ ...data, _id: 'user-new-1' }),
      };
    });
    mockUsuarioModel.findOne = vi.fn().mockResolvedValue(null);
    mockUsuarioModel.findById = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(savedDoc),
    });
    mockUsuarioModel.findByIdAndDelete = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(savedDoc),
    });
    mockUsuarioModel.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([savedDoc]),
    });
    mockUsuarioModel.countDocuments = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    });

    mockInstrumentoModel = { exists: vi.fn().mockResolvedValue(null) };
    mockCalibracionModel = { exists: vi.fn().mockResolvedValue(null) };
    mockCertificadoModel = { exists: vi.fn().mockResolvedValue(null) };
    mockTrazabilidadModel = { exists: vi.fn().mockResolvedValue(null) };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getModelToken(Usuario.name), useValue: mockUsuarioModel },
        {
          provide: getModelToken(Instrumento.name),
          useValue: mockInstrumentoModel,
        },
        {
          provide: getModelToken(Calibracion.name),
          useValue: mockCalibracionModel,
        },
        {
          provide: getModelToken(Certificado.name),
          useValue: mockCertificadoModel,
        },
        {
          provide: getModelToken(TrazabilidadEvento.name),
          useValue: mockTrazabilidadModel,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('CP-11.1: debe registrar un usuario con rol Técnico activo y registrar la acción en auditoría', async () => {
    const result = await service.create(
      {
        nombre: 'Laura Técnico',
        email: 'LAURA@WeightControl.co',
        password: 'Password123!',
        rol: RolUsuario.TECNICO,
      },
      'admin-1',
    );

    expect(result.email).toBe('laura@weightcontrol.co');
    expect(result.rol).toBe(RolUsuario.TECNICO);
    expect(result.activo).toBe(true);
    expect((result as any).password).toBeUndefined();
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        actionType: TipoAccionAuditoria.CREATE,
        entityAffected: EntidadAfectada.USUARIO,
      }),
    );
  });

  it('CP-11.2: debe editar los datos de un usuario, cambiar su rol y registrar auditoría', async () => {
    const result = await service.update(
      'user-123',
      { nombre: 'Carlos Auditor', rol: RolUsuario.AUDITOR },
      'admin-1',
    );

    expect(result.nombre).toBe('Carlos Auditor');
    expect(result.rol).toBe(RolUsuario.AUDITOR);
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: TipoAccionAuditoria.UPDATE,
        previousState: expect.objectContaining({ rol: RolUsuario.TECNICO }),
        newState: expect.objectContaining({ rol: RolUsuario.AUDITOR }),
      }),
    );
  });

  it('CP-11.3: debe inactivar una cuenta y registrar STATUS_CHANGE en auditoría', async () => {
    const result = await service.changeStatus(
      'user-123',
      { activo: false, motivo: 'Fin de contrato' },
      'admin-1',
    );

    expect(result.activo).toBe(false);
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: TipoAccionAuditoria.STATUS_CHANGE,
        previousState: { activo: true },
        newState: { activo: false },
      }),
    );
  });

  it('debe impedir que el administrador inactive su propia cuenta', async () => {
    await expect(
      service.changeStatus('user-123', { activo: false }, 'user-123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('CP-11.5: debe impedir eliminar un usuario con operaciones registradas y sugerir inactivarlo', async () => {
    mockCalibracionModel.exists.mockResolvedValue({ _id: 'cal-1' });

    await expect(service.delete('user-123', 'admin-1')).rejects.toThrow(
      ConflictException,
    );
    await expect(service.delete('user-123', 'admin-1')).rejects.toThrow(
      /inactivar/i,
    );
    expect(mockUsuarioModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('debe permitir eliminar un usuario sin operaciones registradas y auditar el evento', async () => {
    const res = await service.delete('user-123', 'admin-1');

    expect(res.id).toBe('user-123');
    expect(mockUsuarioModel.findByIdAndDelete).toHaveBeenCalledWith('user-123');
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: TipoAccionAuditoria.DELETE,
        entityAffected: EntidadAfectada.USUARIO,
        identifier: 'user-123',
      }),
    );
  });

  it('debe lanzar NotFoundException al consultar un usuario inexistente', async () => {
    mockUsuarioModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    });

    await expect(service.findById('no-existe')).rejects.toThrow(
      NotFoundException,
    );
  });
});
