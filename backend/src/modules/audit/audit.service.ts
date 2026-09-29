import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TrazabilidadEvento,
  TrazabilidadEventoDocument,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';

export class CreateAuditLogDto {
  userId?: string;
  userRole?: string;
  actionType: TipoAccionAuditoria;
  entityAffected: EntidadAfectada;
  identifier: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  descripcion?: string;
}

export class QueryAuditDto {
  entityAffected?: EntidadAfectada | string;
  actionType?: TipoAccionAuditoria | string;
  userId?: string;
  identifier?: string;
  search?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(TrazabilidadEvento.name)
    private readonly auditModel: Model<TrazabilidadEventoDocument>,
  ) {}

  async logEvent(dto: CreateAuditLogDto): Promise<TrazabilidadEventoDocument | null> {
    try {
      const log = new this.auditModel({
        ...dto,
        timestamp: new Date(),
      });
      return await log.save();
    } catch (error) {
      this.logger.error(`Error saving audit log: ${(error as Error).message}`, (error as Error).stack);
      return null;
    }
  }

  async findAll(query: QueryAuditDto = {}): Promise<{
    items: TrazabilidadEventoDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.entityAffected) {
      filter.entityAffected = query.entityAffected;
    }

    if (query.actionType) {
      filter.actionType = query.actionType;
    }

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.identifier) {
      filter.identifier = new RegExp(query.identifier.trim(), 'i');
    }

    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { identifier: regex },
        { descripcion: regex },
        { userRole: regex },
        { ipAddress: regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<TrazabilidadEventoDocument | null> {
    return this.auditModel.findById(id).exec();
  }

  async getRecentSecurityEvents(limit = 10): Promise<TrazabilidadEventoDocument[]> {
    return this.auditModel
      .find({ actionType: TipoAccionAuditoria.AUTH_FAILURE })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
