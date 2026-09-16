import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TrazabilidadEvento,
  TrazabilidadEventoDocument,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';

export interface CreateAuditLogDto {
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
}
