import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import {
  ConexionExterna,
  ConexionExternaDocument,
  SyncLog,
  SyncLogDocument,
  EstadoSincronizacion,
  Instrumento,
  InstrumentoDocument,
  EstadoInstrumento,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateConexionDto } from './dto/create-conexion.dto.js';
import { SincronizarEquipoDto } from './dto/sincronizar-equipo.dto.js';

@Injectable()
export class IntegracionesService {
  private readonly logger = new Logger(IntegracionesService.name);

  constructor(
    @InjectModel(ConexionExterna.name)
    private readonly conexionModel: Model<ConexionExternaDocument>,
    @InjectModel(SyncLog.name)
    private readonly syncLogModel: Model<SyncLogDocument>,
    @InjectModel(Instrumento.name)
    private readonly instrumentoModel: Model<InstrumentoDocument>,
    private readonly auditService: AuditService,
  ) {}

  private hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  /** HU-16 / CP-16.1: Configurar una nueva conexión externa (solo Administrador). */
  async crearConexion(
    dto: CreateConexionDto,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const codigo = dto.codigoSistema.trim().toUpperCase();
    const existente = await this.conexionModel.findOne({ codigoSistema: codigo }).exec();
    if (existente) {
      throw new ConflictException(
        `Ya existe una conexión configurada para el sistema '${codigo}'.`,
      );
    }

    const rawApiKey = `wc_live_${randomBytes(24).toString('hex')}`;
    const apiKeyHash = this.hashApiKey(rawApiKey);

    const conexion = new this.conexionModel({
      nombre: dto.nombre.trim(),
      codigoSistema: codigo,
      endpointUrl: dto.endpointUrl.trim(),
      apiKeyHash,
      activo: dto.activo !== undefined ? dto.activo : true,
      permisos: dto.permisos && dto.permisos.length > 0 ? dto.permisos : ['SINCRONIZAR'],
      creadoPor: adminUserId,
    });

    const guardada = await conexion.save();

    await this.auditService.logEvent({
      userId: adminUserId,
      userRole: 'ADMIN',
      actionType: TipoAccionAuditoria.CREATE,
      entityAffected: EntidadAfectada.CONFIGURACION,
      identifier: codigo,
      newState: { nombre: guardada.nombre, codigoSistema: codigo, activo: guardada.activo },
      ipAddress,
      userAgent,
      descripcion: `Conexión externa configurada para [${codigo}] (${guardada.nombre}).`,
    });

    return {
      id: guardada._id.toString(),
      nombre: guardada.nombre,
      codigoSistema: guardada.codigoSistema,
      endpointUrl: guardada.endpointUrl,
      activo: guardada.activo,
      permisos: guardada.permisos,
      apiKey: rawApiKey, // Se entrega una única vez al crear
    };
  }

  async listarConexiones() {
    return this.conexionModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async cambiarEstadoConexion(id: string, activo: boolean, adminUserId: string) {
    const conexion = await this.conexionModel.findById(id).exec();
    if (!conexion) {
      throw new NotFoundException(`Conexión externa '${id}' no encontrada.`);
    }
    conexion.activo = activo;
    await conexion.save();
    await this.auditService.logEvent({
      userId: adminUserId,
      userRole: 'ADMIN',
      actionType: TipoAccionAuditoria.STATUS_CHANGE,
      entityAffected: EntidadAfectada.CONFIGURACION,
      identifier: conexion.codigoSistema,
      newState: { activo },
      descripcion: `Conexión externa [${conexion.codigoSistema}] ${activo ? 'activada' : 'inactivada'}.`,
    });
    return conexion;
  }

  /**
   * HU-16 / CP-16.4: Verifica credenciales de sistema externo (`x-sistema-codigo` + `x-api-key`).
   */
  async autenticarSistemaExterno(
    codigoSistema: string | undefined,
    apiKey: string | undefined,
    endpoint: string,
  ): Promise<ConexionExternaDocument> {
    if (!codigoSistema || !apiKey) {
      await this.registrarSyncLog({
        sistemaCodigo: codigoSistema || 'DESCONOCIDO',
        direccion: 'ENTRANTE',
        endpoint,
        estado: EstadoSincronizacion.NO_AUTORIZADO,
        codigoHttp: 401,
        errorMensaje: 'Credenciales de integración ausentes.',
      });
      throw new UnauthorizedException(
        'Se requieren los encabezados x-sistema-codigo y x-api-key.',
      );
    }

    const codigo = codigoSistema.trim().toUpperCase();
    const conexion = await this.conexionModel
      .findOne({ codigoSistema: codigo })
      .select('+apiKeyHash')
      .exec();

    if (!conexion) {
      await this.registrarSyncLog({
        sistemaCodigo: codigo,
        direccion: 'ENTRANTE',
        endpoint,
        estado: EstadoSincronizacion.NO_AUTORIZADO,
        codigoHttp: 401,
        errorMensaje: 'Sistema externo no registrado.',
      });
      throw new UnauthorizedException('Sistema externo no autorizado.');
    }

    const expectedBuf = Buffer.from(conexion.apiKeyHash);
    const receivedBuf = Buffer.from(this.hashApiKey(apiKey.trim()));
    if (
      expectedBuf.length !== receivedBuf.length ||
      !timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      await this.registrarSyncLog({
        sistemaCodigo: codigo,
        direccion: 'ENTRANTE',
        endpoint,
        estado: EstadoSincronizacion.NO_AUTORIZADO,
        codigoHttp: 401,
        errorMensaje: 'API Key inválida.',
      });
      throw new UnauthorizedException('Credenciales de integración inválidas.');
    }

    if (!conexion.activo) {
      await this.registrarSyncLog({
        sistemaCodigo: codigo,
        direccion: 'ENTRANTE',
        endpoint,
        estado: EstadoSincronizacion.NO_AUTORIZADO,
        codigoHttp: 403,
        errorMensaje: 'La conexión externa se encuentra inactiva.',
      });
      throw new ForbiddenException('La conexión externa se encuentra inactiva.');
    }

    return conexion;
  }

  /**
   * HU-16 / CP-16.2 & CP-16.5: Sincroniza un equipo desde un sistema externo evitando duplicados.
   */
  async sincronizarEquipo(
    codigoSistema: string | undefined,
    apiKey: string | undefined,
    dto: SincronizarEquipoDto,
  ) {
    const conexion = await this.autenticarSistemaExterno(
      codigoSistema,
      apiKey,
      'POST /integraciones/equipos',
    );

    const serialNorm = dto.serial.trim().toUpperCase();
    const existente = await this.instrumentoModel
      .findOne({ serial: serialNorm })
      .lean()
      .exec();

    if (existente) {
      const respuesta = {
        estado: 'OMITIDO_DUPLICADO',
        duplicado: true,
        serial: serialNorm,
        mensaje: `El equipo con serial '${serialNorm}' ya existe; no se generó duplicado.`,
      };
      await this.registrarSyncLog({
        sistemaCodigo: conexion.codigoSistema,
        direccion: 'ENTRANTE',
        endpoint: 'POST /integraciones/equipos',
        estado: EstadoSincronizacion.DUPLICADO,
        codigoHttp: 200,
        solicitudResumen: { serial: serialNorm, marca: dto.marca, modelo: dto.modelo },
        respuestaResumen: respuesta,
      });
      return respuesta;
    }

    const nuevoInstrumento = new this.instrumentoModel({
      serial: serialNorm,
      marca: dto.marca.trim(),
      modelo: dto.modelo.trim(),
      tipo: dto.tipo,
      categoriaExactitud: dto.categoriaExactitud,
      capacidadMaxima: dto.capacidadMaxima,
      unidadMedida: dto.unidadMedida || 'kg',
      fechaUltimaCalibracion: new Date(dto.fechaUltimaCalibracion),
      fechaProximaCalibracion: new Date(dto.fechaProximaCalibracion),
      codigoPrecintoSIMEL: dto.codigoPrecintoSIMEL,
      estado: EstadoInstrumento.VIGENTE,
      activo: true,
    });

    const guardado = await nuevoInstrumento.save();

    const respuesta = {
      estado: 'SINCRONIZADO',
      duplicado: false,
      id: guardado._id.toString(),
      serial: guardado.serial,
    };

    await this.registrarSyncLog({
      sistemaCodigo: conexion.codigoSistema,
      direccion: 'ENTRANTE',
      endpoint: 'POST /integraciones/equipos',
      estado: EstadoSincronizacion.EXITOSO,
      codigoHttp: 201,
      solicitudResumen: { serial: serialNorm, marca: dto.marca, modelo: dto.modelo },
      respuestaResumen: respuesta,
    });

    return respuesta;
  }

  /**
   * HU-16 / CP-16.6: Envía datos a un sistema externo configurado y registra fallos de comunicación.
   */
  async enviarASistemaExterno(
    codigoSistema: string,
    payload: Record<string, any>,
  ) {
    const codigo = codigoSistema.trim().toUpperCase();
    const conexion = await this.conexionModel
      .findOne({ codigoSistema: codigo, activo: true })
      .lean()
      .exec();

    if (!conexion) {
      throw new NotFoundException(
        `No existe una conexión activa para '${codigo}'.`,
      );
    }

    try {
      const response = await fetch(conexion.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      await this.registrarSyncLog({
        sistemaCodigo: codigo,
        direccion: 'SALIENTE',
        endpoint: conexion.endpointUrl,
        estado: EstadoSincronizacion.EXITOSO,
        codigoHttp: response.status,
        solicitudResumen: payload,
      });

      return { ok: true, codigoHttp: response.status };
    } catch (err) {
      const errorMensaje = (err as Error).message || 'Error de comunicación';
      this.logger.error(`HU-16 Error comunicando con [${codigo}]: ${errorMensaje}`);
      await this.registrarSyncLog({
        sistemaCodigo: codigo,
        direccion: 'SALIENTE',
        endpoint: conexion.endpointUrl,
        estado: EstadoSincronizacion.ERROR_COMUNICACION,
        codigoHttp: 502,
        solicitudResumen: payload,
        errorMensaje,
      });
      return { ok: false, codigoHttp: 502, error: errorMensaje };
    }
  }

  async getHistorialSincronizaciones(limit = 50) {
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    return this.syncLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec();
  }

  private async registrarSyncLog(data: Partial<SyncLog>) {
    try {
      const doc = new this.syncLogModel(data);
      await doc.save();
    } catch (err) {
      this.logger.warn(`No se pudo registrar SyncLog: ${(err as Error).message}`);
    }
  }
}
