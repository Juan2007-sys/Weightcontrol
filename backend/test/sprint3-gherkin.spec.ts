import { Reflector } from '@nestjs/core';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { UsuariosService } from '../src/modules/usuarios/usuarios.service.js';
import { CalibracionesService } from '../src/modules/calibraciones/calibraciones.service.js';
import { InstrumentosService } from '../src/modules/instrumentos/instrumentos.service.js';
import { AlertasService } from '../src/modules/alertas/alertas.service.js';
import { IndicadoresService } from '../src/modules/indicadores/indicadores.service.js';
import { IntegracionesService } from '../src/modules/integraciones/integraciones.service.js';
import { buildSignedVerificationUrl } from '../src/modules/calibraciones/qr-signature.js';
import {
  RolUsuario,
  ResultadoCalibracion,
  EstadoInstrumento,
  EstadoCertificado,
  TipoEventoNotificacion,
  EstadoEnvioNotificacion,
  EstadoSincronizacion,
  TipoInstrumento,
  CategoriaExactitud,
} from '../src/schemas/index.js';

describe('Sprint 3 · Escenarios Gherkin (HU-11 a HU-16)', () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = 'gherkin-sprint3-secret';
  });

  // =========================================================================
  // HU-11: Gestión avanzada de usuarios y roles
  // =========================================================================
  describe('Feature: Gestión avanzada de usuarios y roles (HU-11)', () => {
    it('Scenario (Principal): Registrar un usuario con rol Técnico', async () => {
      // GIVEN el administrador está en la gestión de usuarios
      const mockUsuarioModel: any = vi.fn().mockImplementation(function (data: any) {
        return {
          ...data,
          _id: 'usr-tec-1',
          save: vi.fn().mockResolvedValue({ ...data, _id: 'usr-tec-1' }),
        };
      });
      mockUsuarioModel.findOne = vi.fn().mockResolvedValue(null);
      const mockAudit = { logEvent: vi.fn().mockResolvedValue(undefined) };
      const service = new UsuariosService(mockUsuarioModel, mockAudit as any);

      // WHEN ingresa nombre, correo y el rol "Técnico" AND guarda el nuevo usuario
      const creado = await service.create(
        {
          nombre: 'Laura Gómez',
          email: 'laura.tecnico@weightcontrol.co',
          password: 'Password123!',
          rol: RolUsuario.TECNICO,
        },
        'admin-1',
      );

      // THEN el usuario queda activo con el rol asignado AND la acción queda registrada
      expect(creado.activo).toBe(true);
      expect(creado.rol).toBe(RolUsuario.TECNICO);
      expect(mockAudit.logEvent).toHaveBeenCalledTimes(1);
    });

    it('Scenario (Alternativo): Auditor intenta modificar un equipo', async () => {
      // GIVEN un usuario autenticado con rol "Auditor"
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue([RolUsuario.ADMIN, RolUsuario.TECNICO]),
      } as unknown as Reflector;
      const mockAudit = { logEvent: vi.fn().mockResolvedValue(undefined) };
      const guard = new RolesGuard(reflector, mockAudit as any);
      const context: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'aud-1', email: 'auditor@sic.gov.co', rol: RolUsuario.AUDITOR },
            method: 'PUT',
            originalUrl: '/api/instrumentos/inst-1',
            headers: {},
          }),
        }),
      };

      // WHEN intenta editar los datos de un equipo
      // THEN el sistema rechaza la acción AND el intento queda registrado
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockAudit.logEvent).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // HU-12: Firma electrónica o digital de certificados
  // =========================================================================
  describe('Feature: Firma electrónica o digital de certificados (HU-12)', () => {
    it('Scenario (Principal): Firmar un certificado de calibración', async () => {
      // GIVEN el técnico tiene permiso para firmar AND existe un certificado generado sin firmar
      const calDoc: any = {
        _id: '507f1f77bcf86cd799439011',
        instrumento: '507f1f77bcf86cd799439012',
        numeroCertificado: 'CERT-GHERKIN-12',
        codigoFolio: 'FOLIO-GHERKIN-12',
        fechaCalibracion: new Date('2026-06-01'),
        fechaProximaCalibracion: new Date('2027-06-01'),
        resultado: ResultadoCalibracion.CONFORME,
        bloqueadoInmutable: false,
        anulado: false,
        save: vi.fn().mockResolvedValue(true),
      };
      const certDoc: any = {
        codigoFolio: 'FOLIO-GHERKIN-12',
        sellosAplicados: [],
        save: vi.fn().mockResolvedValue(true),
      };
      const mockCalModel: any = {
        findById: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(calDoc) }),
      };
      const mockCertModel: any = {
        findOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(certDoc) }),
      };
      const mockUserModel: any = {
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ nombre: 'Ing. Pedro', rol: RolUsuario.TECNICO }),
        }),
      };
      const mockAudit = { logEvent: vi.fn().mockResolvedValue(undefined) };

      const service = new CalibracionesService(
        mockCalModel,
        {} as any,
        {} as any,
        mockAudit as any,
        {} as any,
        mockCertModel,
        mockUserModel,
      );

      // WHEN el técnico firma el certificado
      const firma = await service.firmarCertificado('507f1f77bcf86cd799439011', 'tec-1');

      // THEN el certificado muestra firmante, fecha y hora AND la firma queda en el historial
      expect(firma.firmado).toBe(true);
      expect(firma.firmante).toBe('Ing. Pedro');
      expect(firma.fechaFirma).toBeInstanceOf(Date);
      expect(mockAudit.logEvent).toHaveBeenCalledTimes(1);
    });

    it('Scenario (Alternativo): Usuario sin permiso intenta firmar', async () => {
      // GIVEN un usuario sin permiso de firma (Auditor)
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue([
          RolUsuario.ADMIN,
          RolUsuario.TECNICO,
          RolUsuario.INSTITUCION_ACREDITACION,
        ]),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      const context: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'aud-1', rol: RolUsuario.AUDITOR },
            method: 'POST',
            originalUrl: '/api/calibraciones/123/firmar',
            headers: {},
          }),
        }),
      };

      // WHEN intenta firmar un certificado
      // THEN el sistema rechaza la firma
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // HU-13: Verificación de certificados mediante código QR
  // =========================================================================
  describe('Feature: Verificación de certificados mediante código QR (HU-13)', () => {
    it('Scenario (Principal): Verificar un certificado con QR válido', async () => {
      // GIVEN un certificado emitido con su código QR
      const url = buildSignedVerificationUrl('http://localhost:5174', 'CERT-QR-1', 'BAL-100');
      const sig = new URL(url).searchParams.get('sig')!;

      const mockInst = {
        _id: 'inst-1',
        serial: 'BAL-100',
        marca: 'Torrey',
        modelo: 'EQB',
        tipo: TipoInstrumento.BASCULA_COMERCIAL,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 100,
        unidadMedida: 'kg',
        fechaUltimaCalibracion: new Date('2026-06-01'),
        fechaProximaCalibracion: new Date('2027-06-01'),
        propietario: 'Datos Privados Confidenciales',
      };
      const mockCalModel: any = {
        findOne: vi.fn().mockImplementation((filter: any) => {
          const doc = {
            _id: 'cal-1',
            numeroCertificado: 'CERT-QR-1',
            fechaCalibracion: new Date('2026-06-01'),
            fechaProximaCalibracion: new Date('2027-06-01'),
            resultado: ResultadoCalibracion.CONFORME,
            anulado: false,
            instrumento: mockInst,
          };
          return {
            populate: vi.fn().mockResolvedValue(doc),
            sort: vi.fn().mockResolvedValue(doc),
            then: (res: any) => Promise.resolve(doc).then(res),
          };
        }),
      };
      const mockAudit = { logEvent: vi.fn().mockResolvedValue(undefined) };
      const service = new InstrumentosService(
        {} as any,
        {} as any,
        mockAudit as any,
        mockCalModel,
      );

      // WHEN el usuario escanea el QR desde su celular
      const res: any = await service.verifyPublic('BAL-100', { cert: 'CERT-QR-1', sig });

      // THEN ve el serial, la fecha de emisión y el estado "Vigente" AND no ve información confidencial
      expect(res.serial).toBe('BAL-100');
      expect(res.estadoMetrologico).toBe(EstadoInstrumento.VIGENTE);
      expect(res.esVigente).toBe(true);
      expect(res.ultimoCertificado?.numeroCertificado).toBe('CERT-QR-1');
      expect(res.propietario).toBeUndefined();
    });

    it('Scenario (Alternativo): QR que no corresponde a un certificado', async () => {
      // GIVEN un código QR que no está registrado / firma inválida
      const mockAudit = { logEvent: vi.fn().mockResolvedValue(undefined) };
      const service = new InstrumentosService(
        { findOne: vi.fn().mockResolvedValue(null) } as any,
        {} as any,
        mockAudit as any,
      );

      // WHEN el usuario lo escanea
      // THEN el sistema informa que no es un certificado registrado (404 No verificable)
      await expect(
        service.verifyPublic('BAL-FAKE', { cert: 'CERT-FAKE', sig: 'bad-sig' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // HU-14: Notificaciones automáticas por correo electrónico
  // =========================================================================
  describe('Feature: Notificaciones automáticas por correo electrónico (HU-14)', () => {
    it('Scenario (Principal): Aviso de calibración próxima a vencer', async () => {
      // GIVEN hay destinatarios y días de aviso configurados AND un equipo con calibración próxima a vencer
      const store: any[] = [];
      const mockNotifModel: any = {
        findOne: vi.fn().mockReturnValue({
          lean: () => ({ exec: vi.fn().mockResolvedValue(null) }),
        }),
        findOneAndUpdate: vi.fn().mockImplementation((_f: any, u: any) => ({
          exec: vi.fn().mockImplementation(async () => {
            store.push(u.$set);
            return u.$set;
          }),
        })),
      };
      const mockEmail = { sendDirectEmail: vi.fn().mockResolvedValue(undefined) };
      const mockConfig = {
        getDestinatariosEmail: vi.fn().mockResolvedValue(['admin@weightcontrol.co']),
      };
      const service = new AlertasService(
        {} as any,
        {} as any,
        {} as any,
        { logEvent: vi.fn().mockResolvedValue(undefined) } as any,
        mockConfig as any,
        mockNotifModel,
        mockEmail as any,
      );

      // WHEN se ejecuta el proceso de notificaciones
      const res = await service.notificarEventoCorreo({
        evento: TipoEventoNotificacion.PROXIMO_VENCIMIENTO,
        serial: 'BAL-555',
        fechaEvento: new Date('2026-12-01'),
        asunto: 'Calibración próxima a vencer',
        mensaje: 'Equipo próximo a vencer',
        clavePeriodo: 'CRITICA|2026-12-01',
      });

      // THEN se envía un correo con serial y fecha AND el envío queda registrado como exitoso
      expect(res.sent).toBe(true);
      expect(res.estadoEnvio).toBe(EstadoEnvioNotificacion.ENVIADO);
      expect(store[0].serial).toBe('BAL-555');
    });

    it('Scenario (Alternativo): Falla en el envío del correo', async () => {
      // GIVEN una notificación pendiente de enviar
      const store: any[] = [];
      const mockNotifModel: any = {
        findOne: vi.fn().mockReturnValue({
          lean: () => ({ exec: vi.fn().mockResolvedValue(null) }),
        }),
        findOneAndUpdate: vi.fn().mockImplementation((_f: any, u: any) => ({
          exec: vi.fn().mockImplementation(async () => {
            store.push(u.$set);
            return u.$set;
          }),
        })),
      };
      const mockEmail = {
        sendDirectEmail: vi.fn().mockRejectedValue(new Error('Mail server down')),
      };
      const mockAudit = { logEvent: vi.fn().mockResolvedValue(undefined) };
      const service = new AlertasService(
        {} as any,
        {} as any,
        {} as any,
        mockAudit as any,
        { getDestinatariosEmail: vi.fn().mockResolvedValue(['admin@wc.co']) } as any,
        mockNotifModel,
        mockEmail as any,
      );

      // WHEN el servidor de correo no responde
      const res = await service.notificarEventoCorreo({
        evento: TipoEventoNotificacion.PROXIMO_VENCIMIENTO,
        serial: 'BAL-ERR',
        fechaEvento: new Date('2026-12-01'),
        asunto: 'Aviso',
        mensaje: 'Prueba fallo',
        clavePeriodo: 'CRITICA|2026-12-01',
      });

      // THEN el sistema registra el envío con error AND informa el fallo al administrador
      expect(res.estadoEnvio).toBe(EstadoEnvioNotificacion.ERROR);
      expect(store[0].errorMensaje).toContain('Mail server down');
      expect(mockAudit.logEvent).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // HU-15: Panel de indicadores y estadísticas
  // =========================================================================
  describe('Feature: Panel de indicadores y estadísticas (HU-15)', () => {
    const createIndicadoresService = () =>
      new IndicadoresService(
        {
          find: vi.fn().mockImplementation((f: any) => ({
            lean: () => ({
              exec: vi.fn().mockResolvedValue(
                f?.tipo
                  ? [{ _id: 'i1', tipo: f.tipo, estado: EstadoInstrumento.VIGENTE, activo: true }]
                  : [
                      { _id: 'i1', tipo: 'BASCULA_COMERCIAL', estado: EstadoInstrumento.VIGENTE, activo: true },
                      { _id: 'i2', tipo: 'PESA_PATRON', estado: EstadoInstrumento.VENCIDO, activo: false },
                    ],
              ),
            }),
          })),
        } as any,
        {
          countDocuments: vi.fn().mockImplementation((f: any) => ({
            exec: vi.fn().mockResolvedValue(f?.fechaCalibracion ? 1 : 5),
          })),
        } as any,
        {
          find: vi.fn().mockReturnValue({
            lean: () => ({
              exec: vi.fn().mockResolvedValue([{ estado: EstadoCertificado.VALIDO }]),
            }),
          }),
        } as any,
      );

    it('Scenario (Principal): Ver los indicadores generales', async () => {
      // GIVEN el administrador inicia sesión
      const service = createIndicadoresService();

      // WHEN abre el panel de indicadores
      const panel = await service.getPanelIndicadores({});

      // THEN ve equipos activos/inactivos, calibraciones realizadas/pendientes/vencidas y certificados emitidos
      expect(panel.equipos.activos).toBe(1);
      expect(panel.equipos.inactivos).toBe(1);
      expect(panel.calibraciones.realizadas).toBe(5);
      expect(panel.certificados.emitidos).toBe(1);
    });

    it('Scenario (Alternativo): Filtrar por rango de fechas y tipo de equipo', async () => {
      // GIVEN el administrador está en el panel
      const service = createIndicadoresService();

      // WHEN selecciona un rango de fechas y tipo de equipo
      const panel = await service.getPanelIndicadores({
        fechaInicio: '2026-01-01',
        fechaFin: '2026-03-31',
        tipoEquipo: 'BASCULA_COMERCIAL',
      });

      // THEN los indicadores se recalculan según el rango seleccionado y tipo
      expect(panel.calibraciones.realizadas).toBe(1);
      expect(panel.equipos.total).toBe(1);
    });
  });

  // =========================================================================
  // HU-16: Integración con sistemas externos
  // =========================================================================
  describe('Feature: Integración con sistemas externos (HU-16)', () => {
    it('Scenario (Principal): Sincronizar un registro por API REST', async () => {
      // GIVEN una conexión externa autorizada
      const conexiones: any[] = [];
      const logs: any[] = [];
      const instrumentos: any[] = [];

      const mockConn: any = vi.fn().mockImplementation(function (d: any) {
        return {
          ...d,
          _id: 'c1',
          save: vi.fn().mockImplementation(async function (this: any) {
            conexiones.push(this);
            return this;
          }),
        };
      });
      mockConn.findOne = vi.fn().mockImplementation((f: any) => {
        const found = conexiones.find((c) => c.codigoSistema === f.codigoSistema) || null;
        const p: any = Promise.resolve(found);
        p.exec = vi.fn().mockResolvedValue(found);
        p.select = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(found) });
        return p;
      });
      const mockLog: any = vi.fn().mockImplementation(function (d: any) {
        return {
          ...d,
          save: vi.fn().mockImplementation(async function (this: any) {
            logs.push(this);
            return this;
          }),
        };
      });
      const mockInst: any = vi.fn().mockImplementation(function (d: any) {
        return {
          ...d,
          _id: 'inst-ext-1',
          save: vi.fn().mockImplementation(async function (this: any) {
            instrumentos.push(this);
            return this;
          }),
        };
      });
      mockInst.findOne = vi.fn().mockReturnValue({
        lean: () => ({ exec: vi.fn().mockResolvedValue(null) }),
      });

      const service = new IntegracionesService(
        mockConn,
        mockLog,
        mockInst,
        { logEvent: vi.fn().mockResolvedValue(undefined) } as any,
      );
      const conn = await service.crearConexion(
        {
          nombre: 'ERP',
          codigoSistema: 'ERP_GHERKIN',
          endpointUrl: 'https://erp.ejemplo.co',
        },
        'admin-1',
      );

      // WHEN el sistema externo envía un equipo válido
      const res = await service.sincronizarEquipo('ERP_GHERKIN', conn.apiKey, {
        serial: 'EXT-GHERKIN-1',
        marca: 'Mettler',
        modelo: 'IND570',
        tipo: TipoInstrumento.BASCULA_COMERCIAL,
        categoriaExactitud: CategoriaExactitud.CLASE_III,
        capacidadMaxima: 200,
        fechaUltimaCalibracion: '2026-06-01',
        fechaProximaCalibracion: '2027-06-01',
      });

      // THEN WeightControl lo procesa y responde AND registra la solicitud y la respuesta
      expect(res.estado).toBe('SINCRONIZADO');
      expect(logs[0].estado).toBe(EstadoSincronizacion.EXITOSO);
    });

    it('Scenario (Alternativo): Solicitud sin autorización', async () => {
      // GIVEN un sistema externo sin credenciales válidas
      const logs: any[] = [];
      const mockLog: any = vi.fn().mockImplementation(function (d: any) {
        return {
          ...d,
          save: vi.fn().mockImplementation(async function (this: any) {
            logs.push(this);
            return this;
          }),
        };
      });
      const service = new IntegracionesService(
        { findOne: vi.fn() } as any,
        mockLog,
        {} as any,
        { logEvent: vi.fn().mockResolvedValue(undefined) } as any,
      );

      // WHEN envía una solicitud a la API
      // THEN el sistema responde 401 AND no intercambia datos AND registra el intento
      await expect(
        service.sincronizarEquipo(undefined, undefined, {} as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(logs[0].estado).toBe(EstadoSincronizacion.NO_AUTORIZADO);
      expect(logs[0].codigoHttp).toBe(401);
    });
  });
});
