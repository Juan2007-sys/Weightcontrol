import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Configuracion,
  ConfiguracionDocument,
  EntidadAfectada,
  TipoAccionAuditoria,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';

export const CLAVE_UMBRAL_ALERTA = 'umbralAlertaDias';
export const CLAVE_DESTINATARIOS_EMAIL = 'destinatariosNotificacionEmail';
export const UMBRAL_ALERTA_POR_DEFECTO = 30;
export const UMBRAL_ALERTA_MIN = 1;
export const UMBRAL_ALERTA_MAX = 365;

/**
 * M3: el umbral de alerta temprana vive en base de datos, no en el codigo. Cambiarlo no requiere
 * modificar archivos ni redesplegar: el siguiente escaneo (cron) y los calculos de estado lo leen.
 */
@Injectable()
export class ConfiguracionService implements OnModuleInit {
  private readonly logger = new Logger(ConfiguracionService.name);
  private umbralEnMemoria = UMBRAL_ALERTA_POR_DEFECTO;

  constructor(
    @InjectModel(Configuracion.name)
    private readonly configModel: Model<ConfiguracionDocument>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.getUmbralDias();
    } catch (err) {
      this.logger.warn(
        `No se pudo cargar el umbral de alertas, se usa ${UMBRAL_ALERTA_POR_DEFECTO}: ${(err as Error).message}`,
      );
    }
  }

  /** Ultimo valor conocido (sincrono, para calculos de estado). */
  get umbralDiasCache(): number {
    return this.umbralEnMemoria;
  }

  /** Lee el valor vigente de la base (cada escaneo lo consulta, asi aplica en la siguiente corrida). */
  async getUmbralDias(): Promise<number> {
    const doc = await this.configModel.findOne({ clave: CLAVE_UMBRAL_ALERTA }).lean().exec();
    const valor = Number((doc as { valor?: unknown } | null)?.valor);
    this.umbralEnMemoria =
      Number.isInteger(valor) && valor >= UMBRAL_ALERTA_MIN && valor <= UMBRAL_ALERTA_MAX
        ? valor
        : UMBRAL_ALERTA_POR_DEFECTO;
    return this.umbralEnMemoria;
  }

  async setUmbralDias(
    umbralDias: number,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ umbralDias: number }> {
    if (!Number.isInteger(umbralDias) || umbralDias < UMBRAL_ALERTA_MIN || umbralDias > UMBRAL_ALERTA_MAX) {
      throw new BadRequestException(
        `El umbral debe ser un número entero de días entre ${UMBRAL_ALERTA_MIN} y ${UMBRAL_ALERTA_MAX}.`,
      );
    }
    const anterior = await this.getUmbralDias();
    await this.configModel
      .findOneAndUpdate(
        { clave: CLAVE_UMBRAL_ALERTA },
        { $set: { valor: umbralDias, actualizadoPor: userId } },
        { upsert: true, new: true },
      )
      .exec();
    this.umbralEnMemoria = umbralDias;

    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.UPDATE,
      entityAffected: EntidadAfectada.CONFIGURACION,
      identifier: CLAVE_UMBRAL_ALERTA,
      previousState: { umbralDias: anterior },
      newState: { umbralDias },
      ipAddress,
      userAgent,
      descripcion: `Umbral de alerta por vencimiento cambiado de ${anterior} a ${umbralDias} días`,
    });
    return { umbralDias };
  }

  /** HU-14: Obtiene la lista de destinatarios configurados para notificaciones por correo. */
  async getDestinatariosEmail(): Promise<string[]> {
    const doc = await this.configModel
      .findOne({ clave: CLAVE_DESTINATARIOS_EMAIL })
      .lean()
      .exec();
    const raw = (doc as { valor?: unknown } | null)?.valor;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((e) => String(e).trim().toLowerCase())
      .filter((e) => e.length > 0);
  }

  /** HU-14: Configura los destinatarios de notificaciones automáticas por correo electrónico. */
  async setDestinatariosEmail(
    destinatarios: string[],
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ destinatarios: string[] }> {
    const normalizados = Array.from(
      new Set(
        destinatarios
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0),
      ),
    );
    const anterior = await this.getDestinatariosEmail();

    await this.configModel
      .findOneAndUpdate(
        { clave: CLAVE_DESTINATARIOS_EMAIL },
        { $set: { valor: normalizados, actualizadoPor: userId } },
        { upsert: true, new: true },
      )
      .exec();

    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.UPDATE,
      entityAffected: EntidadAfectada.CONFIGURACION,
      identifier: CLAVE_DESTINATARIOS_EMAIL,
      previousState: { destinatarios: anterior },
      newState: { destinatarios: normalizados },
      ipAddress,
      userAgent,
      descripcion: `Destinatarios de correo actualizados (${normalizados.length} configurados)`,
    });

    return { destinatarios: normalizados };
  }
}
