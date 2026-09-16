import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import {
  Alerta,
  AlertaDocument,
  NivelAlerta,
  Instrumento,
  InstrumentoDocument,
  EstadoInstrumento,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificadorEngineService } from './notificador-engine.service.js';
import { QueryAlertasDto } from './dto/query-alertas.dto.js';
import { AlertaResponseDto } from './dto/alerta-response.dto.js';
import { AlertasStatsDto } from './dto/alertas-stats.dto.js';
import { PaginatedResponseDto } from '../instrumentos/dto/paginated-response.dto.js';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectModel(Alerta.name)
    private readonly alertaModel: Model<AlertaDocument>,
    @InjectModel(Instrumento.name)
    private readonly instrumentoModel: Model<InstrumentoDocument>,
    private readonly notificadorEngine: NotificadorEngineService,
    private readonly auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronScanAlertas(): Promise<void> {
    this.logger.log('⏰ Ejecutando escaneo automático programado de alertas metrológicas (Cron)...');
    try {
      const result = await this.scanAlertas();
      this.logger.log(
        `✅ Escaneo completado: ${result.totalEscaneados} instrumentos evaluados, ${result.alertasGeneradas} alertas generadas.`,
      );
    } catch (error) {
      this.logger.error(`❌ Error en cron de alertas: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async scanAlertas(manualTriggerUserId?: string): Promise<{
    totalEscaneados: number;
    alertasGeneradas: number;
    alertas: AlertaResponseDto[];
  }> {
    const instrumentos = await this.instrumentoModel.find().exec();
    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    const nuevasAlertas: AlertaDocument[] = [];

    for (const inst of instrumentos) {
      const fechaProx = new Date(inst.fechaProximaCalibracion);
      const proxInicio = new Date(fechaProx.getFullYear(), fechaProx.getMonth(), fechaProx.getDate());

      const diffTiempo = proxInicio.getTime() - hoyInicio.getTime();
      const diasRestantes = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

      let nivelCriticidad: NivelAlerta | null = null;
      let nuevoEstado: EstadoInstrumento = EstadoInstrumento.VIGENTE;
      let mensaje = '';

      if (diasRestantes < 0) {
        nivelCriticidad = NivelAlerta.VENCIDA;
        nuevoEstado = EstadoInstrumento.VENCIDO;
        mensaje = `El instrumento con serial ${inst.serial} tiene la calibración VENCIDA desde hace ${Math.abs(diasRestantes)} día(s). Se requiere calibración inmediata.`;
      } else if (diasRestantes <= 5) {
        nivelCriticidad = NivelAlerta.CRITICA;
        nuevoEstado = EstadoInstrumento.POR_VENCER;
        mensaje = `¡ALERTA CRÍTICA! La calibración del instrumento ${inst.serial} vencerá en ${diasRestantes} día(s) (Fecha: ${fechaProx.toISOString().split('T')[0]}).`;
      } else if (diasRestantes <= 15) {
        nivelCriticidad = NivelAlerta.MODERADA;
        nuevoEstado = EstadoInstrumento.POR_VENCER;
        mensaje = `Alerta moderada: La calibración del instrumento ${inst.serial} vencerá en ${diasRestantes} días.`;
      } else if (diasRestantes <= 30) {
        nivelCriticidad = NivelAlerta.PREVENTIVA;
        nuevoEstado = EstadoInstrumento.POR_VENCER;
        mensaje = `Aviso preventivo: La calibración del instrumento ${inst.serial} vencerá en ${diasRestantes} días.`;
      } else {
        nuevoEstado = EstadoInstrumento.VIGENTE;
      }

      // Actualizar estado del instrumento si cambió
      if (inst.estado !== nuevoEstado) {
        inst.estado = nuevoEstado;
        await inst.save();
      }

      if (nivelCriticidad) {
        // Verificar si ya existe una alerta activa reciente con el mismo nivel para evitar saturación
        const fechaLimite24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
        const alertaReciente = await this.alertaModel.findOne({
          serial: inst.serial,
          nivelCriticidad,
          createdAt: { $gte: fechaLimite24h },
        });

        if (!alertaReciente) {
          // Despachar a través de todos los canales (Strategy & Observer)
          const canalesNotificados = await this.notificadorEngine.dispatch({
            instrumentoId: inst._id.toString(),
            serial: inst.serial,
            marca: inst.marca,
            modelo: inst.modelo,
            fechaProximaCalibracion: inst.fechaProximaCalibracion,
            diasRestantes,
            nivelCriticidad,
            mensaje,
          });

          const nuevaAlerta = new this.alertaModel({
            instrumento: inst._id,
            serial: inst.serial,
            marca: inst.marca,
            modelo: inst.modelo,
            fechaProximaCalibracion: inst.fechaProximaCalibracion,
            diasRestantes,
            nivelCriticidad,
            mensaje,
            canalesNotificados,
            leida: false,
            despachada: true,
          });

          const guardada = await nuevaAlerta.save();
          nuevasAlertas.push(guardada);
        }
      }
    }

    if (manualTriggerUserId) {
      await this.auditService.logEvent({
        userId: manualTriggerUserId,
        actionType: TipoAccionAuditoria.INSPECTION,
        entityAffected: EntidadAfectada.CONFIGURACION,
        identifier: 'MOTOR_ALERTAS_SCAN',
        descripcion: `Escaneo manual de alertas ejecutado: ${instrumentos.length} evaluados, ${nuevasAlertas.length} alertas generadas.`,
      });
    }

    return {
      totalEscaneados: instrumentos.length,
      alertasGeneradas: nuevasAlertas.length,
      alertas: nuevasAlertas.map((a) => this.mapToResponse(a)),
    };
  }

  async findAll(query: QueryAlertasDto): Promise<PaginatedResponseDto<AlertaResponseDto>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.nivelCriticidad) {
      filter.nivelCriticidad = query.nivelCriticidad;
    }
    if (query.leida !== undefined) {
      filter.leida = query.leida;
    }

    if (query.search && query.search.trim() !== '') {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { serial: searchRegex },
        { marca: searchRegex },
        { modelo: searchRegex },
        { mensaje: searchRegex },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder?.toLowerCase() === 'asc' ? 1 : -1;
    const sortOption: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [docs, total] = await Promise.all([
      this.alertaModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('instrumento', 'serial marca modelo tipo estado fechaProximaCalibracion')
        .exec(),
      this.alertaModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: docs.map((doc) => this.mapToResponse(doc)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getStats(): Promise<AlertasStatsDto> {
    const [total, noLeidas, porCritAgg] = await Promise.all([
      this.alertaModel.countDocuments(),
      this.alertaModel.countDocuments({ leida: false }),
      this.alertaModel.aggregate([
        { $group: { _id: '$nivelCriticidad', count: { $sum: 1 } } },
      ]),
    ]);

    const critMap = Object.fromEntries(porCritAgg.map((item: any) => [item._id, item.count]));

    return {
      total,
      noLeidas,
      porCriticidad: {
        preventivas: critMap[NivelAlerta.PREVENTIVA] || 0,
        moderadas: critMap[NivelAlerta.MODERADA] || 0,
        criticas: critMap[NivelAlerta.CRITICA] || 0,
        vencidas: critMap[NivelAlerta.VENCIDA] || 0,
      },
    };
  }

  async markAsRead(id: string): Promise<AlertaResponseDto> {
    const alerta = await this.alertaModel.findById(id);
    if (!alerta) {
      throw new NotFoundException(`Alerta con ID '${id}' no encontrada.`);
    }

    alerta.leida = true;
    const guardada = await alerta.save();
    return this.mapToResponse(guardada);
  }

  async markAllAsRead(): Promise<{ modifiedCount: number }> {
    const result = await this.alertaModel.updateMany({ leida: false }, { leida: true });
    return { modifiedCount: result.modifiedCount };
  }

  async dispatchAlerta(id: string): Promise<{ success: boolean; canales: string[] }> {
    const alerta = await this.alertaModel.findById(id);
    if (!alerta) {
      throw new NotFoundException(`Alerta con ID '${id}' no encontrada.`);
    }

    const canales = await this.notificadorEngine.dispatch({
      alertaId: alerta._id.toString(),
      instrumentoId: alerta.instrumento?.toString(),
      serial: alerta.serial,
      marca: alerta.marca,
      modelo: alerta.modelo,
      fechaProximaCalibracion: alerta.fechaProximaCalibracion,
      diasRestantes: alerta.diasRestantes,
      nivelCriticidad: alerta.nivelCriticidad,
      mensaje: alerta.mensaje,
    });

    alerta.canalesNotificados = Array.from(new Set([...alerta.canalesNotificados, ...canales]));
    alerta.despachada = true;
    await alerta.save();

    return {
      success: canales.length > 0,
      canales,
    };
  }

  private mapToResponse(doc: AlertaDocument): AlertaResponseDto {
    return {
      id: doc._id.toString(),
      instrumento: doc.instrumento,
      serial: doc.serial,
      marca: doc.marca,
      modelo: doc.modelo,
      fechaProximaCalibracion: doc.fechaProximaCalibracion,
      diasRestantes: doc.diasRestantes,
      nivelCriticidad: doc.nivelCriticidad,
      mensaje: doc.mensaje,
      canalesNotificados: doc.canalesNotificados || [],
      leida: doc.leida,
      despachada: doc.despachada,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
