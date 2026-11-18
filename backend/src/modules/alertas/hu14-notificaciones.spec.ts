import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertasService } from './alertas.service.js';
import { NotificadorEngineService } from './notificador-engine.service.js';
import { EmailNotificadorStrategy } from './strategies/email-notificador.strategy.js';
import { AuditService } from '../audit/audit.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import {
  Alerta,
  Instrumento,
  NotificacionEmail,
  TipoEventoNotificacion,
  EstadoEnvioNotificacion,
} from '../../schemas/index.js';

describe('AlertasService — HU-14 Notificaciones automáticas por correo', () => {
  let service: AlertasService;
  let mockNotificacionEmailModel: any;
  let mockConfigService: any;
  let mockEmailStrategy: any;
  let mockAuditService: any;
  let historialStore: any[];

  beforeEach(async () => {
    historialStore = [];

    mockNotificacionEmailModel = {
      findOne: vi.fn().mockImplementation((query: any) => ({
        lean: () => ({
          exec: vi.fn().mockImplementation(async () => {
            return (
              historialStore.find(
                (item) =>
                  item.claveDeduplicacion === query.claveDeduplicacion &&
                  item.estadoEnvio === query.estadoEnvio,
              ) || null
            );
          }),
        }),
      })),
      findOneAndUpdate: vi
        .fn()
        .mockImplementation((filter: any, update: any) => ({
          exec: vi.fn().mockImplementation(async () => {
            const idx = historialStore.findIndex(
              (i) => i.claveDeduplicacion === filter.claveDeduplicacion,
            );
            const record = { ...update.$set, createdAt: new Date() };
            if (idx >= 0) historialStore[idx] = record;
            else historialStore.unshift(record);
            return record;
          }),
        })),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockImplementation(async () => historialStore),
        }),
      }),
    };

    mockConfigService = {
      getUmbralDias: vi.fn().mockResolvedValue(30),
      getDestinatariosEmail: vi
        .fn()
        .mockResolvedValue(['metrologia@empresa.co', 'calidad@empresa.co']),
    };

    mockEmailStrategy = {
      sendDirectEmail: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertasService,
        { provide: getModelToken(Alerta.name), useValue: {} },
        { provide: getModelToken(Instrumento.name), useValue: {} },
        { provide: NotificadorEngineService, useValue: { dispatch: vi.fn() } },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfiguracionService, useValue: mockConfigService },
        {
          provide: getModelToken(NotificacionEmail.name),
          useValue: mockNotificacionEmailModel,
        },
        { provide: EmailNotificadorStrategy, useValue: mockEmailStrategy },
      ],
    }).compile();

    service = module.get<AlertasService>(AlertasService);
  });

  it('CP-14.2: Calibración próxima a vencer envía correo con serial, fecha y destinatarios configurados', async () => {
    const res = await service.notificarEventoCorreo({
      evento: TipoEventoNotificacion.PROXIMO_VENCIMIENTO,
      serial: 'BASC-100',
      fechaEvento: new Date('2026-12-01'),
      asunto: 'Aviso próximo vencimiento',
      mensaje: 'Calibración próxima a vencer',
      clavePeriodo: 'CRITICA|2026-12-01',
    });

    expect(res.sent).toBe(true);
    expect(res.estadoEnvio).toBe(EstadoEnvioNotificacion.ENVIADO);
    expect(mockEmailStrategy.sendDirectEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['metrologia@empresa.co', 'calidad@empresa.co'],
        text: expect.stringContaining('BASC-100'),
      }),
    );
    expect(mockEmailStrategy.sendDirectEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('2026-12-01'),
      }),
    );
  });

  it('CP-14.3 y CP-14.4: Envía correo por calibración vencida y por nuevo certificado generado', async () => {
    const vencida = await service.notificarEventoCorreo({
      evento: TipoEventoNotificacion.CALIBRACION_VENCIDA,
      serial: 'BASC-200',
      fechaEvento: new Date('2026-10-15'),
      asunto: 'Calibración vencida',
      mensaje: 'Equipo vencido',
      clavePeriodo: 'VENCIDA|2026-10-15',
    });
    const cert = await service.notificarNuevoCertificado(
      'BASC-200',
      'CERT-2026-999',
      new Date('2026-11-18'),
    );

    expect(vencida.sent).toBe(true);
    expect(cert.sent).toBe(true);
    expect(historialStore).toHaveLength(2);
  });

  it('CP-14.5: Mismo evento y periodo procesado dos veces no envía correos repetidos', async () => {
    const primero = await service.notificarEventoCorreo({
      evento: TipoEventoNotificacion.PROXIMO_VENCIMIENTO,
      serial: 'BASC-300',
      fechaEvento: new Date('2026-12-10'),
      asunto: 'Aviso',
      mensaje: 'Próximo vencimiento',
      clavePeriodo: 'PREVENTIVA|2026-12-10',
    });
    const segundo = await service.notificarEventoCorreo({
      evento: TipoEventoNotificacion.PROXIMO_VENCIMIENTO,
      serial: 'BASC-300',
      fechaEvento: new Date('2026-12-10'),
      asunto: 'Aviso',
      mensaje: 'Próximo vencimiento',
      clavePeriodo: 'PREVENTIVA|2026-12-10',
    });

    expect(primero.sent).toBe(true);
    expect(segundo.sent).toBe(false);
    expect(segundo.deduplicated).toBe(true);
    expect(mockEmailStrategy.sendDirectEmail).toHaveBeenCalledTimes(1);
  });

  it('CP-14.6: Falla del servidor de correo registra estado ERROR, informa en auditoría y queda en historial', async () => {
    mockEmailStrategy.sendDirectEmail.mockRejectedValueOnce(
      new Error('SMTP Connection Refused'),
    );

    const res = await service.notificarEventoCorreo({
      evento: TipoEventoNotificacion.CALIBRACION_VENCIDA,
      serial: 'BASC-404',
      fechaEvento: new Date('2026-11-01'),
      asunto: 'Vencida',
      mensaje: 'Calibración vencida',
      clavePeriodo: 'VENCIDA|2026-11-01',
    });

    expect(res.sent).toBe(false);
    expect(res.estadoEnvio).toBe(EstadoEnvioNotificacion.ERROR);
    expect(res.errorMensaje).toContain('SMTP Connection Refused');
    expect(mockAuditService.logEvent).toHaveBeenCalled();

    const historial = await service.getHistorialNotificaciones();
    expect(historial).toHaveLength(1);
    expect(historial[0].estadoEnvio).toBe(EstadoEnvioNotificacion.ERROR);
  });
});
