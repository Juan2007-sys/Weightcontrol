import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Calibracion,
  CalibracionDocument,
  Instrumento,
  InstrumentoDocument,
  EstadoInstrumento,
  ResultadoCalibracion,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { InstrumentosService } from '../instrumentos/instrumentos.service.js';
import { CreateCalibracionDto } from './dto/create-calibracion.dto.js';
import { UpdateCalibracionDto } from './dto/update-calibracion.dto.js';
import { QueryCalibracionesDto } from './dto/query-calibraciones.dto.js';
import { CalibracionResponseDto } from './dto/calibracion-response.dto.js';
import { PaginatedResponseDto } from '../instrumentos/dto/paginated-response.dto.js';

@Injectable()
export class CalibracionesService {
  private readonly logger = new Logger(CalibracionesService.name);

  constructor(
    @InjectModel(Calibracion.name)
    private readonly calibracionModel: Model<CalibracionDocument>,
    @InjectModel(Instrumento.name)
    private readonly instrumentoModel: Model<InstrumentoDocument>,
    private readonly instrumentosService: InstrumentosService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createDto: CreateCalibracionDto,
    tecnicoId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CalibracionResponseDto> {
    const instrumento = await this.instrumentoModel.findById(createDto.instrumentoId);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${createDto.instrumentoId}' no encontrado.`);
    }

    const fechaCal = new Date(createDto.fechaCalibracion);
    const fechaProx = new Date(createDto.fechaProximaCalibracion);

    if (fechaProx <= fechaCal) {
      throw new BadRequestException(
        'La fecha de próxima calibración debe ser estrictamente posterior a la fecha de calibración.',
      );
    }

    const numCertificadoNormalizado = createDto.numeroCertificado.trim();
    const existingCert = await this.calibracionModel.findOne({
      numeroCertificado: numCertificadoNormalizado,
    });
    if (existingCert) {
      throw new ConflictException(
        `Ya existe una calibración registrada con el número de certificado '${numCertificadoNormalizado}'.`,
      );
    }

    const nuevaCalibracion = new this.calibracionModel({
      ...createDto,
      numeroCertificado: numCertificadoNormalizado,
      instrumento: instrumento._id,
      tecnico: tecnicoId,
      fechaCalibracion: fechaCal,
      fechaProximaCalibracion: fechaProx,
    });

    const guardada = await nuevaCalibracion.save();

    // Actualización automática y encadenada del estado del Instrumento (Regla Metrológica)
    if (createDto.resultado === ResultadoCalibracion.CONFORME) {
      instrumento.fechaUltimaCalibracion = fechaCal;
      instrumento.fechaProximaCalibracion = fechaProx;
      if (createDto.codigoPrecintoSIMEL) {
        instrumento.codigoPrecintoSIMEL = createDto.codigoPrecintoSIMEL;
      }
      instrumento.estado = this.instrumentosService.calcularEstado(fechaProx);
    } else {
      // Si el resultado es No Conforme, el instrumento pasa a estado Vencido para bloquear operaciones
      instrumento.estado = EstadoInstrumento.VENCIDO;
    }
    instrumento.actualizadoPor = tecnicoId;
    await instrumento.save();

    // Auditoría inmutable ISO/IEC 27001
    await this.auditService.logEvent({
      userId: tecnicoId,
      actionType: TipoAccionAuditoria.CALIBRATE,
      entityAffected: EntidadAfectada.CALIBRACION,
      identifier: guardada.numeroCertificado,
      newState: {
        calibracionId: guardada._id.toString(),
        numeroCertificado: guardada.numeroCertificado,
        instrumentoSerial: instrumento.serial,
        resultado: guardada.resultado,
        nuevoEstadoInstrumento: instrumento.estado,
      },
      ipAddress,
      userAgent,
      descripcion: `Registro de informe de calibración ${guardada.numeroCertificado} para instrumento ${instrumento.serial} con resultado ${guardada.resultado}`,
    });

    return this.findById(guardada._id.toString());
  }

  async findAll(query: QueryCalibracionesDto): Promise<PaginatedResponseDto<CalibracionResponseDto>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.instrumentoId) {
      filter.instrumento = query.instrumentoId;
    }
    if (query.tecnicoId) {
      filter.tecnico = query.tecnicoId;
    }
    if (query.resultado) {
      filter.resultado = query.resultado;
    }

    if (query.fechaDesde || query.fechaHasta) {
      filter.fechaCalibracion = {};
      if (query.fechaDesde) {
        filter.fechaCalibracion.$gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        filter.fechaCalibracion.$lte = new Date(query.fechaHasta);
      }
    }

    if (query.search && query.search.trim() !== '') {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { numeroCertificado: searchRegex },
        { laboratorioAcreditado: searchRegex },
        { codigoPrecintoSIMEL: searchRegex },
        { observaciones: searchRegex },
      ];
    }

    const sortField = query.sortBy || 'fechaCalibracion';
    const sortDirection = query.sortOrder?.toLowerCase() === 'asc' ? 1 : -1;
    const sortOption: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [docs, total] = await Promise.all([
      this.calibracionModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('instrumento', 'serial marca modelo tipo estado')
        .populate('tecnico', 'nombre email rol tarjetaProfesional')
        .exec(),
      this.calibracionModel.countDocuments(filter).exec(),
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

  async findById(id: string): Promise<CalibracionResponseDto> {
    const calibracion = await this.calibracionModel
      .findById(id)
      .populate('instrumento', 'serial marca modelo tipo estado')
      .populate('tecnico', 'nombre email rol tarjetaProfesional');

    if (!calibracion) {
      throw new NotFoundException(`Calibración con ID '${id}' no encontrada.`);
    }

    return this.mapToResponse(calibracion);
  }

  async findByInstrumento(instrumentoId: string): Promise<CalibracionResponseDto[]> {
    const docs = await this.calibracionModel
      .find({ instrumento: instrumentoId })
      .sort({ fechaCalibracion: -1 })
      .populate('instrumento', 'serial marca modelo tipo estado')
      .populate('tecnico', 'nombre email rol tarjetaProfesional');

    return docs.map((doc) => this.mapToResponse(doc));
  }

  async update(
    id: string,
    updateDto: UpdateCalibracionDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CalibracionResponseDto> {
    const calibracion = await this.calibracionModel.findById(id);
    if (!calibracion) {
      throw new NotFoundException(`Calibración con ID '${id}' no encontrada.`);
    }

    const previousState = calibracion.toObject();

    if (updateDto.numeroCertificado) {
      const normalizado = updateDto.numeroCertificado.trim();
      if (normalizado !== calibracion.numeroCertificado) {
        const existing = await this.calibracionModel.findOne({ numeroCertificado: normalizado });
        if (existing) {
          throw new ConflictException(`Ya existe otra calibración con el certificado '${normalizado}'.`);
        }
        calibracion.numeroCertificado = normalizado;
      }
    }

    if (updateDto.laboratorioAcreditado !== undefined) {
      calibracion.laboratorioAcreditado = updateDto.laboratorioAcreditado;
    }
    if (updateDto.resultado !== undefined) {
      calibracion.resultado = updateDto.resultado;
    }
    if (updateDto.codigoPrecintoSIMEL !== undefined) {
      calibracion.codigoPrecintoSIMEL = updateDto.codigoPrecintoSIMEL;
    }
    if (updateDto.patronesUtilizados !== undefined) {
      calibracion.patronesUtilizados = updateDto.patronesUtilizados as any;
    }
    if (updateDto.erroresMaximosPermitidos !== undefined) {
      calibracion.erroresMaximosPermitidos = updateDto.erroresMaximosPermitidos as any;
    }
    if (updateDto.incertidumbreExpandida !== undefined) {
      calibracion.incertidumbreExpandida = updateDto.incertidumbreExpandida;
    }
    if (updateDto.observaciones !== undefined) {
      calibracion.observaciones = updateDto.observaciones;
    }
    if (updateDto.archivoInformeUrl !== undefined) {
      calibracion.archivoInformeUrl = updateDto.archivoInformeUrl;
    }

    if (updateDto.fechaCalibracion) {
      calibracion.fechaCalibracion = new Date(updateDto.fechaCalibracion);
    }
    if (updateDto.fechaProximaCalibracion) {
      calibracion.fechaProximaCalibracion = new Date(updateDto.fechaProximaCalibracion);
    }

    const actualizado = await calibracion.save();

    // Auditoría inmutable
    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.UPDATE,
      entityAffected: EntidadAfectada.CALIBRACION,
      identifier: actualizado.numeroCertificado,
      previousState,
      newState: actualizado.toObject(),
      ipAddress,
      userAgent,
      descripcion: `Actualización de informe de calibración ${actualizado.numeroCertificado}`,
    });

    return this.findById(actualizado._id.toString());
  }

  async delete(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; id: string }> {
    const calibracion = await this.calibracionModel.findById(id);
    if (!calibracion) {
      throw new NotFoundException(`Calibración con ID '${id}' no encontrada.`);
    }

    const previousState = calibracion.toObject();
    await this.calibracionModel.findByIdAndDelete(id);

    // Auditoría inmutable
    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.DELETE,
      entityAffected: EntidadAfectada.CALIBRACION,
      identifier: calibracion.numeroCertificado,
      previousState,
      ipAddress,
      userAgent,
      descripcion: `Eliminación de calibración ${calibracion.numeroCertificado}`,
    });

    return {
      message: `Calibración con certificado '${calibracion.numeroCertificado}' eliminada exitosamente.`,
      id,
    };
  }

  private mapToResponse(doc: CalibracionDocument): CalibracionResponseDto {
    return {
      id: doc._id.toString(),
      instrumento: doc.instrumento,
      tecnico: doc.tecnico,
      laboratorioAcreditado: doc.laboratorioAcreditado,
      numeroCertificado: doc.numeroCertificado,
      fechaCalibracion: doc.fechaCalibracion,
      fechaProximaCalibracion: doc.fechaProximaCalibracion,
      resultado: doc.resultado,
      codigoPrecintoSIMEL: doc.codigoPrecintoSIMEL,
      patronesUtilizados: doc.patronesUtilizados || [],
      erroresMaximosPermitidos: doc.erroresMaximosPermitidos || [],
      incertidumbreExpandida: doc.incertidumbreExpandida,
      observaciones: doc.observaciones,
      archivoInformeUrl: doc.archivoInformeUrl,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
