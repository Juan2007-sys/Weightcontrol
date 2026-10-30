import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Instrumento,
  InstrumentoDocument,
  EstadoInstrumento,
  TipoAccionAuditoria,
  EntidadAfectada,
  TipoInstrumento,
  CategoriaExactitud,
  Calibracion,
  CalibracionDocument,
  ResultadoCalibracion,
  Usuario,
  UsuarioDocument,
  TIPOS_EVIDENCIA,
} from '../../schemas/index.js';
import type { TipoEvidencia } from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { ValidationEngineService } from './validators/validation-engine.service.js';
import { CreateInstrumentoDto } from './dto/create-instrumento.dto.js';
import { UpdateInstrumentoDto } from './dto/update-instrumento.dto.js';
import { InstrumentoResponseDto } from './dto/instrumento-response.dto.js';
import { QueryInstrumentosDto } from './dto/query-instrumentos.dto.js';
import { PaginatedResponseDto } from './dto/paginated-response.dto.js';
import { InstrumentoStatsDto } from './dto/instrumento-stats.dto.js';
import { PublicVerificationDto } from './dto/public-verification.dto.js';
import { verifyCertificateSignature } from '../calibraciones/qr-signature.js';
import type { FieldError } from './validators/instrumento-validator.interface.js';

/** Contexto opcional de una consulta publica (QR firmado y datos para auditoria). */
export interface PublicVerificationContext {
  cert?: string;
  sig?: string;
  ipAddress?: string;
  userAgent?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Fecha calendario YYYY-MM-DD (UTC): evita que el cliente la muestre un dia antes por zona horaria. */
export function toFechaCalendario(valor: Date | string | undefined | null): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

const NO_VERIFICABLE = 'certificado no verificable';

@Injectable()
export class InstrumentosService {
  private readonly logger = new Logger(InstrumentosService.name);

  constructor(
    @InjectModel(Instrumento.name)
    private readonly instrumentoModel: Model<InstrumentoDocument>,
    private readonly validationEngine: ValidationEngineService,
    private readonly auditService: AuditService,
    @Optional()
    @InjectModel(Calibracion.name)
    private readonly calibracionModel?: Model<CalibracionDocument>,
    @Optional()
    @InjectModel(Usuario.name)
    private readonly usuarioModel?: Model<UsuarioDocument>,
    @Optional()
    private readonly configuracionService?: ConfiguracionService,
  ) {}

  calcularEstado(
    fechaProxima: Date,
    umbralDias: number = this.configuracionService?.umbralDiasCache ?? 30,
  ): EstadoInstrumento {
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

  /**
   * Ejecuta la validacion normativa y, si falla, responde 400 con el contrato historico
   * `errors: string[]` MAS `fieldErrors: {campo, mensaje}[]` para que la UI asocie cada
   * error a su campo (HU-02). Se apoya en `validationEngine.assertValid` y solo enriquece
   * la excepcion cuando el motor no incluyo `fieldErrors`.
   */
  private assertInstrumentoValido(data: Parameters<ValidationEngineService['assertValid']>[0]): void {
    try {
      this.validationEngine.assertValid(data);
    } catch (err) {
      if (err instanceof BadRequestException) {
        const body = err.getResponse() as any;
        if (body && typeof body === 'object' && !Array.isArray(body.fieldErrors)) {
          let fieldErrors: FieldError[] | undefined;
          try {
            fieldErrors = this.validationEngine.validate(data)?.fieldErrors;
          } catch {
            fieldErrors = undefined;
          }
          throw new BadRequestException({
            ...body,
            fieldErrors:
              fieldErrors ??
              (Array.isArray(body.errors)
                ? body.errors.map((mensaje: string) => ({ campo: 'general', mensaje }))
                : []),
          });
        }
      }
      throw err;
    }
  }

  async create(
    createDto: CreateInstrumentoDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InstrumentoResponseDto> {
    const serialNormalizado = createDto.serial.trim().toUpperCase();

    const existing = await this.instrumentoModel.findOne({
      serial: { $regex: new RegExp(`^${escapeRegex(serialNormalizado)}$`, 'i') },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un instrumento registrado con el serial '${serialNormalizado}'.`);
    }

    if (createDto.codigoPrecintoSIMEL) {
      const precintoNormalizado = createDto.codigoPrecintoSIMEL.trim().toUpperCase();
      const existingPrecinto = await this.instrumentoModel.findOne({
        codigoPrecintoSIMEL: { $regex: new RegExp(`^${escapeRegex(precintoNormalizado)}$`, 'i') },
      });
      if (existingPrecinto) {
        throw new ConflictException(`Ya existe un instrumento registrado con el precinto SIMEL '${precintoNormalizado}'.`);
      }
    }

    const fechaUltima = new Date(createDto.fechaUltimaCalibracion);
    const fechaProxima = new Date(createDto.fechaProximaCalibracion);

    const numeroDivisiones = this.calcularNumeroDivisiones(
      createDto.capacidadMaxima,
      createDto.divisionEscala,
    );

    // Validación NTC 2031 desacoplada (OCP)
    this.assertInstrumentoValido({
      serial: serialNormalizado,
      marca: createDto.marca,
      modelo: createDto.modelo,
      tipo: createDto.tipo,
      categoriaExactitud: createDto.categoriaExactitud,
      capacidadMaxima: createDto.capacidadMaxima,
      capacidadMinima: createDto.capacidadMinima,
      unidadMedida: createDto.unidadMedida,
      divisionEscala: createDto.divisionEscala,
      numeroDivisionesVerificacion: numeroDivisiones,
      codigoPrecintoSIMEL: createDto.codigoPrecintoSIMEL,
      evidenciasFotograficas: createDto.evidenciasFotograficas,
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
      activo: true,
      evidenciasMeta: this.metaEvidencias(TIPOS_EVIDENCIA, userId),
      creadoPor: userId,
      actualizadoPor: userId,
    });

    let guardado: InstrumentoDocument;
    try {
      guardado = await nuevoInstrumento.save();
    } catch (err: any) {
      if (err?.code === 11000 || (err?.message && err.message.includes('E11000'))) {
        throw new ConflictException(`Ya existe un instrumento registrado con el serial '${serialNormalizado}'.`);
      }
      throw err;
    }

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

  async findAll(
    query: QueryInstrumentosDto,
    opciones: { publico?: boolean } = {},
  ): Promise<PaginatedResponseDto<InstrumentoResponseDto>> {
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

    if (query.marca && query.marca.trim() !== '') {
      filter.marca = new RegExp(escapeRegex(query.marca.trim()), 'i');
    }
    if (query.activo === 'true') {
      filter.activo = { $ne: false };
    } else if (query.activo === 'false') {
      filter.activo = false;
    }
    if (query.capacidadDesde !== undefined || query.capacidadHasta !== undefined) {
      filter.capacidadMaxima = {};
      if (query.capacidadDesde !== undefined) filter.capacidadMaxima.$gte = Number(query.capacidadDesde);
      if (query.capacidadHasta !== undefined) filter.capacidadMaxima.$lte = Number(query.capacidadHasta);
    }
    if (query.registroDesde || query.registroHasta) {
      filter.createdAt = {};
      if (query.registroDesde) filter.createdAt.$gte = new Date(query.registroDesde);
      if (query.registroHasta) {
        // Fecha calendario: incluye todo el dia final.
        const hasta = new Date(query.registroHasta);
        if (/^\d{4}-\d{2}-\d{2}$/.test(query.registroHasta)) hasta.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = hasta;
      }
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
      const searchRegex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { serial: searchRegex },
        { marca: searchRegex },
        { modelo: searchRegex },
        { codigoPrecintoSIMEL: searchRegex },
        // Sin sesion no se permite buscar por datos del propietario/ubicacion (evita enumerarlos).
        ...(opciones.publico
          ? []
          : [
              { 'propietario.nombreRazonSocial': searchRegex },
              { 'propietario.nitRut': searchRegex },
              { ubicacionFisica: searchRegex },
            ]),
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
        .populate('inactivadoPor', 'nombre email rol')
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


    // HU-07: el numero de serie es el identificador del equipo y no se modifica.
    if (updateDto.serial && updateDto.serial.trim().toUpperCase() !== instrumento.serial) {
      throw new BadRequestException(
        'El número de serie es el identificador del equipo y no puede modificarse.',
      );
    }

    if (updateDto.marca !== undefined) instrumento.marca = updateDto.marca;
    if (updateDto.modelo !== undefined) instrumento.modelo = updateDto.modelo;
    if (updateDto.tipo !== undefined) instrumento.tipo = updateDto.tipo;
    if (updateDto.categoriaExactitud !== undefined) instrumento.categoriaExactitud = updateDto.categoriaExactitud;
    if (updateDto.capacidadMaxima !== undefined) instrumento.capacidadMaxima = updateDto.capacidadMaxima;
    if (updateDto.capacidadMinima !== undefined) instrumento.capacidadMinima = updateDto.capacidadMinima;
    if (updateDto.unidadMedida !== undefined) instrumento.unidadMedida = updateDto.unidadMedida;
    if (updateDto.divisionEscala !== undefined) instrumento.divisionEscala = updateDto.divisionEscala;
    if (updateDto.evidenciasFotograficas !== undefined) {
      const cambiadas = TIPOS_EVIDENCIA.filter(
        (t) => updateDto.evidenciasFotograficas![t] !== instrumento.evidenciasFotograficas?.[t],
      );
      instrumento.evidenciasFotograficas = updateDto.evidenciasFotograficas as any;
      if (cambiadas.length > 0) {
        instrumento.evidenciasMeta = {
          ...(instrumento.evidenciasMeta || {}),
          ...this.metaEvidencias(cambiadas, userId),
        };
        instrumento.markModified?.('evidenciasMeta');
      }
    }
    if (updateDto.codigoPrecintoSIMEL !== undefined) {
      if (updateDto.codigoPrecintoSIMEL) {
        const precintoNormalizado = updateDto.codigoPrecintoSIMEL.trim().toUpperCase();
        if (precintoNormalizado !== instrumento.codigoPrecintoSIMEL) {
          const existingPrecinto = await this.instrumentoModel.findOne({
            codigoPrecintoSIMEL: { $regex: new RegExp(`^${escapeRegex(precintoNormalizado)}$`, 'i') },
            _id: { $ne: id },
          });
          if (existingPrecinto) {
            throw new ConflictException(`Ya existe otro instrumento registrado con el precinto SIMEL '${precintoNormalizado}'.`);
          }
        }
        instrumento.codigoPrecintoSIMEL = precintoNormalizado;
      } else {
        instrumento.codigoPrecintoSIMEL = undefined;
      }
    }
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
    this.assertInstrumentoValido({
      serial: instrumento.serial,
      marca: instrumento.marca,
      modelo: instrumento.modelo,
      tipo: instrumento.tipo,
      categoriaExactitud: instrumento.categoriaExactitud,
      capacidadMaxima: instrumento.capacidadMaxima,
      capacidadMinima: instrumento.capacidadMinima,
      unidadMedida: instrumento.unidadMedida,
      divisionEscala: instrumento.divisionEscala,
      numeroDivisionesVerificacion: instrumento.numeroDivisionesVerificacion,
      codigoPrecintoSIMEL: instrumento.codigoPrecintoSIMEL,
      evidenciasFotograficas: instrumento.evidenciasFotograficas,
      fechaUltimaCalibracion: instrumento.fechaUltimaCalibracion,
      fechaProximaCalibracion: instrumento.fechaProximaCalibracion,
    });

    // C2: un instrumento vencido por calibracion No Conforme solo se restablece con una Conforme.
    instrumento.estado =
      instrumento.motivoVencimiento === 'NO_CONFORME'
        ? EstadoInstrumento.VENCIDO
        : updateDto.estado || this.calcularEstado(instrumento.fechaProximaCalibracion);
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

  private metaEvidencias(tipos: TipoEvidencia[], userId: string) {
    const ahora = new Date();
    const meta: Partial<Record<TipoEvidencia, { fechaCarga: Date; cargadoPor: string }>> = {};
    for (const t of tipos) meta[t] = { fechaCarga: ahora, cargadoPor: userId };
    return meta;
  }

  /** HU-08: inactiva o reactiva un equipo sin borrar su informacion historica. */
  async setActivo(
    id: string,
    activo: boolean,
    motivo: string | undefined,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<InstrumentoResponseDto> {
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }
    const estabaActivo = instrumento.activo !== false;
    if (estabaActivo === activo) {
      throw new ConflictException(
        `El instrumento ${instrumento.serial} ya se encuentra ${activo ? 'activo' : 'inactivo'}.`,
      );
    }
    if (!activo && (!motivo || motivo.trim().length < 5)) {
      throw new BadRequestException('Debe indicar el motivo de la inactivación (mínimo 5 caracteres).');
    }

    instrumento.activo = activo;
    instrumento.fechaInactivacion = activo ? undefined : new Date();
    instrumento.inactivadoPor = activo ? undefined : userId;
    instrumento.motivoInactivacion = activo ? undefined : motivo!.trim();
    instrumento.actualizadoPor = userId;
    const guardado = await instrumento.save();

    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.STATUS_CHANGE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: guardado.serial,
      previousState: { activo: estabaActivo },
      newState: { activo, motivo: motivo?.trim() },
      ipAddress,
      userAgent,
      descripcion: `${activo ? 'Reactivación' : 'Inactivación'} de instrumento serial ${guardado.serial}${
        activo ? '' : `. Motivo: ${motivo!.trim()}`
      }`,
    });
    return this.mapToResponse(guardado);
  }

  private async nombresUsuarios(ids: string[]): Promise<Record<string, { nombre?: string; email?: string }>> {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (!this.usuarioModel || unicos.length === 0) return {};
    const usuarios: any[] = await (this.usuarioModel as any)
      .find({ _id: { $in: unicos } }, 'nombre email')
      .lean();
    return Object.fromEntries(usuarios.map((u) => [String(u._id), { nombre: u.nombre, email: u.email }]));
  }

  /** HU-09: fotografias del equipo con tipo, fecha de carga y usuario que las cargo. */
  async getEvidencias(id: string) {
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }
    const meta: Record<string, any> = instrumento.evidenciasMeta || {};
    const quienes = await this.nombresUsuarios(
      TIPOS_EVIDENCIA.map((t) => (meta[t]?.cargadoPor ? String(meta[t].cargadoPor) : '')),
    );
    const etiquetas: Record<TipoEvidencia, string> = {
      fotoEquipo: 'Equipo',
      fotoPrecinto: 'Precinto',
      fotoUbicacion: 'Ubicación',
    };
    return {
      instrumentoId: String(instrumento._id),
      serial: instrumento.serial,
      evidencias: TIPOS_EVIDENCIA.filter((t) => instrumento.evidenciasFotograficas?.[t]).map((t) => {
        const uid = meta[t]?.cargadoPor ? String(meta[t].cargadoPor) : undefined;
        return {
          tipo: t,
          etiqueta: etiquetas[t],
          url: instrumento.evidenciasFotograficas[t],
          fechaCarga: meta[t]?.fechaCarga ?? (instrumento as any).createdAt,
          cargadoPor: uid ? { id: uid, ...(quienes[uid] || {}) } : undefined,
        };
      }),
    };
  }

  /** HU-09: reemplaza una fotografia concreta. Siempre queda asociada al equipo y al usuario. */
  async reemplazarEvidencia(
    id: string,
    tipo: string,
    imagen: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!(TIPOS_EVIDENCIA as string[]).includes(tipo)) {
      throw new BadRequestException(`Tipo de evidencia inválido. Use: ${TIPOS_EVIDENCIA.join(', ')}.`);
    }
    if (!imagen || typeof imagen !== 'string' || !imagen.trim()) {
      throw new BadRequestException('La imagen de la evidencia es obligatoria.');
    }
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }
    const t = tipo as TipoEvidencia;
    instrumento.evidenciasFotograficas = { ...instrumento.evidenciasFotograficas, [t]: imagen.trim() } as any;
    instrumento.evidenciasMeta = { ...(instrumento.evidenciasMeta || {}), ...this.metaEvidencias([t], userId) };
    instrumento.markModified?.('evidenciasMeta');
    instrumento.actualizadoPor = userId;
    await instrumento.save();

    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.UPDATE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: instrumento.serial,
      newState: { evidenciaActualizada: t },
      ipAddress,
      userAgent,
      descripcion: `Actualización de evidencia fotográfica (${t}) del instrumento ${instrumento.serial}`,
    });
    return this.getEvidencias(id);
  }

  /** HU-06: historial de eventos y calibraciones asociado al serial. Solo lectura. */
  async getHistorial(id: string) {
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      throw new NotFoundException(`Instrumento con ID '${id}' no encontrado.`);
    }
    const serial = instrumento.serial;
    const eventos = await this.auditService.findByInstrumentoSerial(serial);

    const camposIgnorados = new Set([
      '_id', '__v', 'createdAt', 'updatedAt', 'actualizadoPor', 'evidenciasFotograficas', 'evidenciasMeta',
    ]);
    const cambios = (ev: any): string[] => {
      const prev = ev.previousState || {};
      const next = ev.newState || {};
      return Object.keys(next)
        .filter((k) => !camposIgnorados.has(k) && JSON.stringify(prev[k]) !== JSON.stringify(next[k]))
        .slice(0, 12);
    };

    const calibraciones: any[] = this.calibracionModel
      ? await (this.calibracionModel as any)
          .find({ instrumento: instrumento._id })
          .sort({ fechaCalibracion: -1 })
          .populate('tecnico', 'nombre email')
          .lean()
      : [];

    return {
      instrumentoId: String(instrumento._id),
      serial,
      activo: instrumento.activo !== false,
      totalEventos: eventos.length,
      eventos: eventos.map((ev) => ({
        id: String(ev._id),
        fecha: ev.timestamp,
        tipoOperacion: ev.actionType,
        entidad: ev.entityAffected,
        identificador: ev.identifier,
        descripcion: ev.descripcion,
        usuario: ev.userId
          ? {
              id: String(ev.userId._id ?? ev.userId),
              nombre: ev.userId.nombre,
              email: ev.userId.email,
              rol: ev.userRole ?? ev.userId.rol,
            }
          : undefined,
        camposModificados: ev.actionType === 'UPDATE' ? cambios(ev) : undefined,
      })),
      calibraciones: calibraciones.map((c) => ({
        id: String(c._id),
        numeroCertificado: c.numeroCertificado,
        fechaCalibracion: c.fechaCalibracion,
        fechaProximaCalibracion: c.fechaProximaCalibracion,
        resultado: c.resultado,
        anulado: c.anulado === true,
        laboratorio: c.laboratorioAcreditado,
        tecnico: c.tecnico?.nombre,
      })),
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
    const serialNormalizado = (serial || '').trim().toUpperCase();
    const instrumento = await this.instrumentoModel
      .findOne({ serial: serialNormalizado })
      .populate('creadoPor', 'nombre email rol')
      .populate('actualizadoPor', 'nombre email rol');

    if (!instrumento) {
      throw new NotFoundException(`Instrumento con serial '${serialNormalizado}' no encontrado.`);
    }

    return this.mapToResponse(instrumento);
  }

  private async auditarVerificacionFallida(
    identificador: string,
    motivo: string,
    ctx: PublicVerificationContext,
  ): Promise<void> {
    try {
      await this.auditService.logEvent({
        actionType: TipoAccionAuditoria.VERIFICATION_FAILURE,
        entityAffected: EntidadAfectada.CERTIFICADO,
        identifier: (identificador || 'sin-identificador').toString().slice(0, 120),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        descripcion: `Verificacion publica fallida: ${motivo}`,
      });
    } catch {
      // La auditoria nunca debe impedir responder la consulta publica.
    }
  }

  private async noVerificable(
    identificador: string,
    motivo: string,
    ctx: PublicVerificationContext,
  ): Promise<never> {
    await this.auditarVerificacionFallida(identificador, motivo, ctx);
    throw new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: NO_VERIFICABLE,
    });
  }

  /**
   * Consulta pública sanitizada de verificación ciudadana (HU-05).
   * Cumple estrictamente con la Ley de Habeas Data: NO EXPONE datos del propietario ni usuarios internos.
   *
   * Dos modos:
   *  - QR (ctx.cert presente): exige firma HMAC valida sobre cert+serial y que el cert pertenezca
   *    a un instrumento con ese serial. Cualquier fallo -> 404 "certificado no verificable".
   *  - Manual (sin cert): consulta por serial / numero de certificado / folio, sin firma. Decision de
   *    transicion: la consulta manual no puede firmarse (el ciudadano teclea el dato) y solo devuelve
   *    datos publicos; un QR sin firma que traiga cert SI se rechaza para que no sirva para falsificar.
   * Toda verificacion fallida queda auditada (VERIFICATION_FAILURE).
   */
  async verifyPublic(serial: string, ctx: PublicVerificationContext = {}): Promise<PublicVerificationDto> {
    const cert = (ctx.cert ?? '').trim();

    if (cert) {
      return this.verifyFromQr(serial, cert, ctx);
    }

    if (!serial || serial.trim() === '') {
      return this.noVerificable('', 'identificador vacio', ctx);
    }

    const serialNormalizado = serial.trim().toUpperCase();

    let instrumento = await this.instrumentoModel.findOne({
      serial: { $regex: new RegExp(`^${escapeRegex(serialNormalizado)}$`, 'i') },
    });

    let calEncontrada: any = null;
    if (!instrumento && this.calibracionModel) {
      calEncontrada = await this.calibracionModel
        .findOne({
          $or: [
            { numeroCertificado: { $regex: new RegExp(`^${escapeRegex(serialNormalizado)}$`, 'i') } },
            { codigoFolio: { $regex: new RegExp(`^${escapeRegex(serialNormalizado)}$`, 'i') } },
          ],
        })
        .populate('instrumento');

      if (calEncontrada && calEncontrada.instrumento) {
        instrumento = calEncontrada.instrumento as any;
      }
    }

    if (!instrumento) {
      return this.noVerificable(serialNormalizado, 'serial o certificado inexistente', ctx);
    }

    return this.buildPublicDto(instrumento, calEncontrada);
  }

  private async verifyFromQr(
    serial: string,
    cert: string,
    ctx: PublicVerificationContext,
  ): Promise<PublicVerificationDto> {
    const serialNormalizado = (serial ?? '').trim().toUpperCase();

    if (!serialNormalizado || !verifyCertificateSignature(cert, serialNormalizado, ctx.sig)) {
      return this.noVerificable(cert, 'firma del QR ausente o invalida', ctx);
    }
    if (!this.calibracionModel) {
      return this.noVerificable(cert, 'sin acceso a certificados', ctx);
    }

    const cal: any = await this.calibracionModel
      .findOne({ numeroCertificado: cert })
      .populate('instrumento');
    const instrumento: any = cal?.instrumento;

    if (!cal || !instrumento || (instrumento.serial ?? '').toString().trim().toUpperCase() !== serialNormalizado) {
      return this.noVerificable(cert, 'el certificado no corresponde al serial', ctx);
    }

    return this.buildPublicDto(instrumento, cal);
  }

  /** Consulta publica por ID interno: devuelve unicamente el DTO sanitizado (nunca propietario/creadoPor/evidencias). */
  async verifyPublicById(id: string, ctx: PublicVerificationContext = {}): Promise<PublicVerificationDto> {
    if (!id || !isValidObjectId(id)) {
      return this.noVerificable(id, 'identificador invalido', ctx);
    }
    const instrumento = await this.instrumentoModel.findById(id);
    if (!instrumento) {
      return this.noVerificable(id, 'instrumento inexistente', ctx);
    }
    return this.buildPublicDto(instrumento, null);
  }

  private async buildPublicDto(instrumento: any, calEncontrada: any): Promise<PublicVerificationDto> {
    let estadoCalculado = this.calcularEstado(instrumento.fechaProximaCalibracion);
    // C2: vencido por calibracion No Conforme, la fecha no lo restablece.
    const noConforme = instrumento.motivoVencimiento === 'NO_CONFORME';
    if (noConforme) {
      estadoCalculado = EstadoInstrumento.VENCIDO;
    }

    let ultimoCertificado: any = undefined;
    let certificadoAnulado = false;
    if (this.calibracionModel) {
      try {
        let cal: any = calEncontrada;
        if (!cal) {
          // Preferir el certificado vigente (no anulado); si todos estan anulados, el mas reciente.
          cal = await this.calibracionModel
            .findOne({ instrumento: instrumento._id as any, anulado: { $ne: true } })
            .sort({ fechaCalibracion: -1 });
          if (!cal) {
            cal = await this.calibracionModel
              .findOne({ instrumento: instrumento._id as any })
              .sort({ fechaCalibracion: -1 });
          }
        }

        if (cal) {
          certificadoAnulado = cal.anulado === true;
          let reemplazadoPorNumero: string | undefined;
          if (certificadoAnulado && cal.certificadoReemplazadoPor) {
            try {
              const rep: any = await this.calibracionModel.findById(cal.certificadoReemplazadoPor);
              reemplazadoPorNumero = rep?.numeroCertificado;
            } catch {
              reemplazadoPorNumero = undefined;
            }
          }
          ultimoCertificado = {
            numeroCertificado: cal.numeroCertificado,
            codigoFolio: cal.codigoFolio || cal.numeroCertificado,
            fechaCalibracion: toFechaCalendario(cal.fechaCalibracion) as string,
            resultado: cal.resultado,
            pdfUrl: `/api/calibraciones/${cal._id}/pdf`,
            ...(certificadoAnulado ? { anulado: true, reemplazadoPorNumero } : {}),
          };
        }
      } catch {
        // Fallback si no hay calibración
      }
    }

    const resultadoNoConforme = ultimoCertificado?.resultado === ResultadoCalibracion.NO_CONFORME;
    const esVigente =
      estadoCalculado === EstadoInstrumento.VIGENTE && !certificadoAnulado && !noConforme && !resultadoNoConforme;

    return {
      serial: instrumento.serial,
      marca: instrumento.marca,
      modelo: instrumento.modelo,
      tipo: instrumento.tipo,
      categoriaExactitud: instrumento.categoriaExactitud,
      capacidadMaxima: instrumento.capacidadMaxima,
      capacidadMinima: instrumento.capacidadMinima ?? 0,
      unidadMedida: instrumento.unidadMedida,
      divisionEscala: instrumento.divisionEscala,
      estadoMetrologico: estadoCalculado,
      esVigente,
      fechaUltimaCalibracion: toFechaCalendario(instrumento.fechaUltimaCalibracion) as string,
      fechaProximaCalibracion: toFechaCalendario(instrumento.fechaProximaCalibracion) as string,
      codigoPrecintoSIMEL: instrumento.codigoPrecintoSIMEL,
      ...(certificadoAnulado ? { certificadoAnulado: true } : {}),
      ultimoCertificado,
      mensajeVerificacion: noConforme || resultadoNoConforme
        ? 'Instrumento NO CONFORME: la última calibración no cumplió los requisitos metrológicos; certificado anulado y equipo no apto para uso.'
        : certificadoAnulado
        ? 'Certificado ANULADO: este certificado ya no es vigente. Consulte el certificado que lo reemplaza.'
        : esVigente
          ? 'Instrumento verificado y conforme ante el Registro Único de Metrología Legal (RUMP).'
          : 'Instrumento con calibración vencida o en estado no conforme.',
    };
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
      capacidadMinima: doc.capacidadMinima ?? 0,
      unidadMedida: doc.unidadMedida,
      divisionEscala: doc.divisionEscala,
      numeroDivisionesVerificacion: doc.numeroDivisionesVerificacion,
      codigoPrecintoSIMEL: doc.codigoPrecintoSIMEL,
      propietario: doc.propietario,
      evidenciasFotograficas: doc.evidenciasFotograficas,
      ubicacionFisica: doc.ubicacionFisica,
      fechaUltimaCalibracion: doc.fechaUltimaCalibracion,
      fechaProximaCalibracion: doc.fechaProximaCalibracion,
      estado: doc.estado,
      activo: doc.activo !== false,
      fechaInactivacion: doc.fechaInactivacion,
      inactivadoPor: doc.inactivadoPor,
      motivoInactivacion: doc.motivoInactivacion,
      evidenciasMeta: doc.evidenciasMeta as any,
      creadoPor: doc.creadoPor,
      actualizadoPor: doc.actualizadoPor,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
