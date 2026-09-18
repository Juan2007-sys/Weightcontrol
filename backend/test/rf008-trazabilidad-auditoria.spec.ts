import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from '../src/modules/audit/audit.service.js';
import {
  TipoAccionAuditoria,
  EntidadAfectada,
  TrazabilidadEvento,
} from '../src/schemas/trazabilidad-evento.schema.js';

describe('🔴 RF008 — Trazabilidad e Inmutabilidad de Auditoría (ISO/IEC 27001)', () => {
  let auditService: AuditService;
  let mockAuditModel: any;

  beforeEach(() => {
    mockAuditModel = class {
      _id = 'audit_event_123';
      timestamp = new Date();
      save = vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      });
      constructor(dto: any) {
        Object.assign(this, dto);
        this.timestamp = new Date();
      }
      static find = vi.fn();
      static countDocuments = vi.fn();
    };

    auditService = new AuditService(mockAuditModel as any);
  });

  describe('Registro de Eventos de Auditoría (Audit Log)', () => {
    it('TC-RF008-01: Registro inmutable de evento de creación de instrumento con snapshot previo y nuevo', async () => {
      const eventDto = {
        userId: 'user_admin_01',
        userRole: 'ADMIN',
        actionType: TipoAccionAuditoria.CREATE,
        entityAffected: EntidadAfectada.INSTRUMENTO,
        identifier: 'BASC-2026-99',
        newState: {
          serial: 'BASC-2026-99',
          marca: 'Torrey',
          capacidadMaxima: 50,
        },
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        descripcion: 'Registro de nuevo instrumento de pesaje',
      };

      const result = await auditService.logEvent(eventDto);
      expect(result).toBeDefined();
      expect(result?.actionType).toBe(TipoAccionAuditoria.CREATE);
      expect(result?.entityAffected).toBe(EntidadAfectada.INSTRUMENTO);
      expect(result?.identifier).toBe('BASC-2026-99');
      expect(result?.timestamp).toBeInstanceOf(Date);
    });

    it('TC-RF008-02: Registro inmutable de evento de calibración', async () => {
      const eventDto = {
        userId: 'user_tecnico_01',
        userRole: 'TECNICO',
        actionType: TipoAccionAuditoria.CALIBRATE,
        entityAffected: EntidadAfectada.CALIBRACION,
        identifier: 'CERT-2026-999',
        newState: {
          resultado: 'Conforme',
          numeroCertificado: 'CERT-2026-999',
        },
        descripcion: 'Calibración metrológica aprobada',
      };

      const result = await auditService.logEvent(eventDto);
      expect(result?.actionType).toBe(TipoAccionAuditoria.CALIBRATE);
      expect(result?.identifier).toBe('CERT-2026-999');
    });

    it('TC-RF008-03: Registro inmutable de intento de autenticación fallido (Seguridad ISO 27001)', async () => {
      const eventDto = {
        actionType: TipoAccionAuditoria.AUTH_FAILURE,
        entityAffected: EntidadAfectada.USUARIO,
        identifier: 'hacker@intruso.com',
        ipAddress: '185.220.101.5',
        descripcion: 'Intento de inicio de sesión con contraseña incorrecta',
      };

      const result = await auditService.logEvent(eventDto);
      expect(result?.actionType).toBe(TipoAccionAuditoria.AUTH_FAILURE);
      expect(result?.identifier).toBe('hacker@intruso.com');
    });
  });

  describe('Inmutabilidad y No Modificabilidad (Auditoría Forense)', () => {
    it('TC-RF008-04: El servicio de auditoría no expone métodos de UPDATE ni DELETE', () => {
      const auditPrototype = Object.getPrototypeOf(auditService);
      expect(auditPrototype.update).toBeUndefined();
      expect(auditPrototype.delete).toBeUndefined();
      expect(auditPrototype.remove).toBeUndefined();
      expect(auditPrototype.patch).toBeUndefined();
    });
  });
});
