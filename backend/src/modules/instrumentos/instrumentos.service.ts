import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Instrumento,
  InstrumentoDocument,
  EstadoInstrumento,
  TipoAccionAuditoria,
  EntidadAfectada,
  TipoInstrumento,
  CategoriaExactitud,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { ValidationEngineService } from './validators/validation-engine.service.js';
import { CreateInstrumentoDto } from './dto/create-instrumento.dto.js';
import { UpdateInstrumentoDto } from './dto/update-instrumento.dto.js';
import { InstrumentoResponseDto } from './dto/instrumento-response.dto.js';
import { QueryInstrumentosDto } from './dto/query-instrumentos.dto.js';
import { PaginatedResponseDto } from './dto/paginated-response.dto.js';
import { InstrumentoStatsDto } from './dto/instrumento-stats.dto.js';

@Injectable()
export class InstrumentosService {
  private readonly logger = new Logger(InstrumentosService.name);

  constructor(
    @InjectModel(Instrumento.name)
    private readonly instrumentoModel: Model<InstrumentoDocument>,
    private readonly validationEngine: ValidationEngineService,
    private readonly auditService: AuditService,
  ) {}

  calcularEstado(fechaProxima: Date, umbralDias: number = 30): EstadoInstrumento {
    const ahora = new Date();
    const proxima = new Date(fechaProxima);

    // Normalizar a medianoche para comparación de fechas sin desfase de horas
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const proximaInicio = new Date(proxima.getFullYear(), proxima.getMonth(), proxima.getDate());

    if (proximaInicio < hoyInicio) {
      return EstadoInstrumento.VENCIDO;
    }

    const fechaLimiteAlerta = new Date(hoyInicio);
    fechaLimiteAlerta.setDate(fechaLimiteAlerta.getDate() + umbralDias);

    if (proximaInicio <= fechaLimiteAlerta) {
      return EstadoInstrumento.POR_VENCER;
    }

    return EstadoInstrumento.VIGENTE;
  }

  calcularNumeroDivisiones(capacidadMaxima: number, divisionEscala?: number): number | undefined {
    if (divisionEscala && divisionEscala > 0) {
      return Math.round(capacidadMaxima / divisionEscala);
    }
    return undefined;
  }

  async create(
    createDto: CreateInstrumentoDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InstrumentoResponseDto> {
    const serialNormalizado = createDto.serial.trim().toUpperCase();

    const existing = await this.instrumentoModel.findOne({ serial: serialNormalizado });
    if (existing) {
      throw new ConflictException(`Ya existe un instrumento registrado con el serial '${serialNormalizado}'.`);
    }

    const fechaUltima = new Date(createDto.fechaUltimaCalibracion);
    const fechaProxima = new Date(createDto.fechaProximaCalibracion);

    const numeroDivisiones = this.calcularNumeroDivisiones(
      createDto.capacidadMaxima,
      createDto.divisionEscala,
    );

    // Validación NTC 2031 desacoplada (OCP)
    this.validationEngine.assertValid({
      serial: serialNormalizado,
      marca: createDto.marca,
      modelo: createDto.modelo,
      tipo: createDto.tipo,
      categoriaExactitud: createDto.categoriaExactitud,
      capacidadMaxima: createDto.capacidadMaxima,
      unidadMedida: createDto.unidadMedida,
      divisionEscala: createDto.divisionEscala,
      numeroDivisionesVerificacion: numeroDivisiones,
      codigoPrecintoSIMEL: createDto.codigoPrecintoSIMEL,
      fechaUltimaCalibracion: fechaUltima,
      fechaProximaCalibracion: fechaProxima,
    });

    const estado = this.calcularEstado(fechaProxima);

    const nuevoInstrumento = new this.instrumentoModel({
      ...createDto,
      serial: serialNormalizado,
      fechaUltimaCalibracion: fechaUltima,
      fechaProximaCalibracion: fechaProxima,
      numeroDivisionesVerificacion: numeroDivisiones,
      estado,
      creadoPor: userId,
      actualizadoPor: userId,
    });

    const guardado = await nuevoInstrumento.save();

    // Auditoría inmutable (ISO/IEC 27001)
    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.CREATE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: guardado.serial,
      newState: guardado.toObject(),
      ipAddress,
      userAgent,
      descripcion: `Registro de instrumento serial ${guardado.serial} (${guardado.tipo} - ${guardado.marca})`,
    });

    return this.mapToResponse(guardado);
  }

  async findAll(query: QueryInstrumentosDto): Promise<PaginatedResponseDto<InstrumentoResponseDto>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.tipo) {
      filter.tipo = query.tipo;
    }
    if (query.estado) {
      filter.estado = query.estado;
    }
    if (query.categoriaExactitud) {
      filter.categoriaExactitud = query.categoriaExactitud;
    }
    if (query.unidadMedida) {
      filter.unidadMedida = query.unidadMedida;
    }

    if (query.fechaDesde || query.fechaHasta) {
      filter.fechaProximaCalibracion = {};
      if (query.fechaDesde) {
        filter.fechaProximaCalibracion.$gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        filter.fechaProximaCalibracion.$lte = new Date(query.fechaHasta);
      }
    }

    if (query.search && query.search.trim() !== '') {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { serial: searchRegex },
        { marca: searchRegex },
        { modelo: searchRegex },
        { codigoPrecintoSIMEL: searchRegex },
        { 'propietario.nombreRazonSocial': searchRegex },
        { 'propietario.nitRut': searchRegex },
        { ubicacionFisica: searchRegex },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder?.toLowerCase() === 'asc' ? 1 : -1;
    const sortOption: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [docs, total] = await Promise.all([
      this.instrumentoModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('creadoPor', 'nombre email rol')
        .populate('actualizadoPor', 'nombre email rol')
        .exec(),
      this.instrumentoModel.countDocuments(filter).exec(),
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

  async getStats(): Promise<InstrumentoStatsDto> {
    const [total, porEstadoAgg, porTipoAgg, porCatAgg] = await Promise.all([
      this.instrumentoModel.countDocuments(),
      this.instrumentoModel.aggregate([
        { $group: { _id: '$estado', count: { $sum: 1 } } },
      ]),
      this.instrumentoModel.aggregate([
        { $group: { _id: '$tipo', count: { $sum: 1 } } },
      ]),
      this.instrumentoModel.aggregate([
        { $group: { _id: '$categoriaExactitud', count: { $sum: 1 } } },
      ]),
    ]);

    const estadoMap = Object.fromEntries(porEstadoAgg.map((item: any) => [item._id, item.count]));
    const tipoMap = Object.fromEntries(porTipoAgg.map((item: any) => [item._id, item.count]));
    const catMap = Object.fromEntries(porCatAgg.map((item: any) => [item._id, item.count]));

    return {
      total,
      porEstado: {
        vigentes: estadoMap[EstadoInstrumento.VIGENTE] || 0,
        porVencer: estadoMap[EstadoInstrumento.POR_VENCER] || 0,
        vencidos: estadoMap[EstadoInstrumento.VENCIDO] || 0,
      },
      porTipo: {
        basculas: tipoMap[TipoInstrumento.BASCULA] || 0,
        pesas: tipoMap[TipoInstrumento.PESA] || 0,
        dinamometros: tipoMap[TipoInstrumento.DINAMOMETRO] || 0,
      },
      porCategoriaExactitud: {
        claseI: catMap[CategoriaExactitud.CLASE_I] || 0,
        claseII: catMap[CategoriaExactitud.CLASE_II] || 0,
        claseIII: catMap[CategoriaExactitud.CLASE_III] || 0,
        claseIIII: catMap[CategoriaExactitud.CLASE_IIII] || 0,
      },
    };
  }

  async update(
    id: string,
    updateDto: UpdateInstrumentoDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InstrumentoResponseDto> {
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }

    const previousState = instrumento.toObject();

    if (updateDto.serial) {
      const serialNormalizado = updateDto.serial.trim().toUpperCase();
      if (serialNormalizado !== instrumento.serial) {
        const existing = await this.instrumentoModel.findOne({ serial: serialNormalizado });
        if (existing) {
          throw new ConflictException(`Ya existe otro instrumento registrado con el serial '${serialNormalizado}'.`);
        }
        instrumento.serial = serialNormalizado;
      }
    }

    if (updateDto.marca !== undefined) instrumento.marca = updateDto.marca;
    if (updateDto.modelo !== undefined) instrumento.modelo = updateDto.modelo;
    if (updateDto.tipo !== undefined) instrumento.tipo = updateDto.tipo;
    if (updateDto.categoriaExactitud !== undefined) instrumento.categoriaExactitud = updateDto.categoriaExactitud;
    if (updateDto.capacidadMaxima !== undefined) instrumento.capacidadMaxima = updateDto.capacidadMaxima;
    if (updateDto.unidadMedida !== undefined) instrumento.unidadMedida = updateDto.unidadMedida;
    if (updateDto.divisionEscala !== undefined) instrumento.divisionEscala = updateDto.divisionEscala;
    if (updateDto.codigoPrecintoSIMEL !== undefined) instrumento.codigoPrecintoSIMEL = updateDto.codigoPrecintoSIMEL;
    if (updateDto.propietario !== undefined) instrumento.propietario = updateDto.propietario as any;
    if (updateDto.ubicacionFisica !== undefined) instrumento.ubicacionFisica = updateDto.ubicacionFisica;

    if (updateDto.fechaUltimaCalibracion) {
      instrumento.fechaUltimaCalibracion = new Date(updateDto.fechaUltimaCalibracion);
    }
    if (updateDto.fechaProximaCalibracion) {
      instrumento.fechaProximaCalibracion = new Date(updateDto.fechaProximaCalibracion);
    }

    instrumento.numeroDivisionesVerificacion = this.calcularNumeroDivisiones(
      instrumento.capacidadMaxima,
      instrumento.divisionEscala,
    );

    // Validación NTC 2031 con los nuevos datos combinados
    this.validationEngine.assertValid({
      serial: instrumento.serial,
      marca: instrumento.marca,
      modelo: instrumento.modelo,
      tipo: instrumento.tipo,
      categoriaExactitud: instrumento.categoriaExactitud,
      capacidadMaxima: instrumento.capacidadMaxima,
      unidadMedida: instrumento.unidadMedida,
      divisionEscala: instrumento.divisionEscala,
      numeroDivisionesVerificacion: instrumento.numeroDivisionesVerificacion,
      codigoPrecintoSIMEL: instrumento.codigoPrecintoSIMEL,
      fechaUltimaCalibracion: instrumento.fechaUltimaCalibracion,
      fechaProximaCalibracion: instrumento.fechaProximaCalibracion,
    });

    instrumento.estado = updateDto.estado || this.calcularEstado(instrumento.fechaProximaCalibracion);
    instrumento.actualizadoPor = userId;

    const actualizado = await instrumento.save();

    // Auditoría inmutable (ISO/IEC 27001)
    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.UPDATE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: actualizado.serial,
      previousState,
      newState: actualizado.toObject(),
      ipAddress,
      userAgent,
      descripcion: `Actualización de instrumento serial ${actualizado.serial}`,
    });

    return this.mapToResponse(actualizado);
  }

  async delete(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; id: string }> {
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }

    const previousState = instrumento.toObject();
    await this.instrumentoModel.findByIdAndDelete(id);

    // Auditoría inmutable
    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.DELETE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: instrumento.serial,
      previousState,
      ipAddress,
      userAgent,
      descripcion: `Eliminación de instrumento serial ${instrumento.serial}`,
    });

    return {
      message: `Instrumento con serial '${instrumento.serial}' eliminado exitosamente.`,
      id,
    };
  }

  async findById(id: string): Promise<InstrumentoResponseDto> {
    const instrumento = await this.instrumentoModel
      .findById(id)
      .populate('creadoPor', 'nombre email rol')
      .populate('actualizadoPor', 'nombre email rol');

    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }

    return this.mapToResponse(instrumento);
  }

  async findBySerial(serial: string): Promise<InstrumentoResponseDto> {
    const serialNormalizado = serial.trim().toUpperCase();
    const instrumento = await this.instrumentoModel
      .findOne({ serial: serialNormalizado })
      .populate('creadoPor', 'nombre email rol')
      .populate('actualizadoPor', 'nombre email rol');

    if (!instrumento) {
      throw new NotFoundException(`Instrumento con serial '${serialNormalizado}' no encontrado.`);
    }

    return this.mapToResponse(instrumento);
  }

  private mapToResponse(doc: InstrumentoDocument): InstrumentoResponseDto {
    return {
      id: doc._id.toString(),
      serial: doc.serial,
      marca: doc.marca,
      modelo: doc.modelo,
      tipo: doc.tipo,
      categoriaExactitud: doc.categoriaExactitud,
      capacidadMaxima: doc.capacidadMaxima,
      unidadMedida: doc.unidadMedida,
      divisionEscala: doc.divisionEscala,
      numeroDivisionesVerificacion: doc.numeroDivisionesVerificacion,
      codigoPrecintoSIMEL: doc.codigoPrecintoSIMEL,
      propietario: doc.propietario,
      ubicacionFisica: doc.ubicacionFisica,
      fechaUltimaCalibracion: doc.fechaUltimaCalibracion,
      fechaProximaCalibracion: doc.fechaProximaCalibracion,
      estado: doc.estado,
      creadoPor: doc.creadoPor,
      actualizadoPor: doc.actualizadoPor,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
