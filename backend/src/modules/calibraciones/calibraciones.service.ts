import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Calibracion,
  CalibracionDocument,
  Instrumento,
  InstrumentoDocument,
  Certificado,
  CertificadoDocument,
  EstadoInstrumento,
  ResultadoCalibracion,
  TipoAccionAuditoria,
  EntidadAfectada,
  EstadoCertificado,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { InstrumentosService } from '../instrumentos/instrumentos.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { CreateCalibracionDto } from './dto/create-calibracion.dto.js';
import { UpdateCalibracionDto } from './dto/update-calibracion.dto.js';
import { CorregirCalibracionDto } from './dto/corregir-calibracion.dto.js';
import { buildSignedVerificationUrl } from './qr-signature.js';
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
    private readonly pdfGeneratorService: PdfGeneratorService,
    @Optional()
    @InjectModel(Certificado.name)
    private readonly certificadoModel?: Model<CertificadoDocument>,
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

    // HU-08: un equipo inactivo no puede utilizarse en nuevas calibraciones.
    if (instrumento.activo === false) {
      throw new BadRequestException(
        `El instrumento ${instrumento.serial} está inactivo y no puede utilizarse en nuevas calibraciones.`,
      );
    }

    // 1. Validación de completitud (HU-04 Criterio 4)
    if (!createDto.patronesUtilizados || createDto.patronesUtilizados.length === 0) {
      throw new BadRequestException(
        'Calibración incompleta: Debe declarar al menos 1 patrón de calibración trazable para emitir el certificado.',
      );
    }

    if (!createDto.erroresMaximosPermitidos || createDto.erroresMaximosPermitidos.length === 0) {
      throw new BadRequestException(
        'Calibración incompleta: Debe registrar al menos 1 punto de medición de ensayo de error contra el EMP.',
      );
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

    const codigoFolio = `CERT-FOLIO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const esNoConforme = createDto.resultado !== ResultadoCalibracion.CONFORME;

    const nuevaCalibracion = new this.calibracionModel({
      ...createDto,
      // C2: un resultado No Conforme nace con el certificado anulado (no vigente).
      ...(esNoConforme
        ? {
            anulado: true,
            motivoAnulacion: 'Resultado No Conforme',
            fechaAnulacion: new Date(),
            anuladoPor: tecnicoId,
          }
        : {}),
      numeroCertificado: numCertificadoNormalizado,
      codigoFolio,
      bloqueadoInmutable: true, // Sello de inmutabilidad tras su emisión
      instrumento: instrumento._id,
      tecnico: tecnicoId,
      fechaCalibracion: fechaCal,
      fechaProximaCalibracion: fechaProx,
      pdfUrl: `/api/calibraciones/${numCertificadoNormalizado}/pdf`,
    });

    const guardada = await nuevaCalibracion.save();

    // Crear registro en la colección de Certificados si el modelo está disponible
    if (this.certificadoModel) {
      try {
        const certDoc = new this.certificadoModel({
          codigoFolio,
          instrumento: instrumento._id,
          calibracion: guardada._id,
          emitidoPor: tecnicoId,
          fechaEmision: fechaCal,
          fechaVencimiento: fechaProx,
          estado: createDto.resultado === ResultadoCalibracion.CONFORME ? EstadoCertificado.VALIDO : EstadoCertificado.ANULADO,
          pdfUrl: `/api/calibraciones/${guardada._id}/pdf`,
        });
        await certDoc.save();
      } catch (certErr) {
        this.logger.warn(`Error al guardar certificado espejo: ${certErr}`);
      }
    }

    // Actualización automática y encadenada del estado del Instrumento (Regla Metrológica)
    if (createDto.resultado === ResultadoCalibracion.CONFORME) {
      instrumento.fechaUltimaCalibracion = fechaCal;
      instrumento.fechaProximaCalibracion = fechaProx;
      if (createDto.codigoPrecintoSIMEL) {
        instrumento.codigoPrecintoSIMEL = createDto.codigoPrecintoSIMEL;
      }
      instrumento.estado = this.instrumentosService.calcularEstado(fechaProx);
      // Una calibracion Conforme posterior restablece el instrumento.
      instrumento.motivoVencimiento = undefined;
    } else {
      // Si el resultado es No Conforme, el instrumento pasa a estado Vencido para bloquear operaciones
      instrumento.estado = EstadoInstrumento.VENCIDO;
      instrumento.motivoVencimiento = 'NO_CONFORME';
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
        codigoFolio,
        instrumentoSerial: instrumento.serial,
        resultado: guardada.resultado,
        nuevoEstadoInstrumento: instrumento.estado,
        bloqueadoInmutable: true,
      },
      ipAddress,
      userAgent,
      descripcion: `Emisión de certificado inmutable de calibración ${guardada.numeroCertificado} para instrumento ${instrumento.serial} con resultado ${guardada.resultado}`,
    });

    return this.findById(guardada._id.toString());
  }

  /**
   * Correccion formal (HU-04). El certificado sellado NUNCA se edita: se emite uno nuevo
   * (que referencia al anterior en `reemplazaA`) y el original solo recibe los campos de
   * estado de anulacion (`anulado`, `motivoAnulacion`, `certificadoReemplazadoPor`...).
   * Todo queda auditado (CALIBRATE del nuevo + ANNUL del original).
   */
  async corregir(
    id: string,
    dto: CorregirCalibracionDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CalibracionResponseDto> {
    const motivo = (dto.motivo ?? '').trim();
    if (motivo.length < 10) {
      throw new BadRequestException('El motivo de anulación es obligatorio (mínimo 10 caracteres).');
    }
    if (!dto.nuevaCalibracion) {
      throw new BadRequestException('Debe indicar los datos del certificado de reemplazo.');
    }

    const original = await this.calibracionModel.findById(id);
    if (!original) {
      throw new NotFoundException(`Calibración con ID '${id}' no encontrada.`);
    }
    if (original.anulado) {
      throw new ConflictException(`El certificado '${original.numeroCertificado}' ya fue anulado.`);
    }
    if (dto.nuevaCalibracion.numeroCertificado?.trim() === original.numeroCertificado) {
      throw new ConflictException('El certificado de reemplazo debe tener un número distinto al del certificado anulado.');
    }

    const instrumentoId = (original.instrumento as any)?._id?.toString?.() ?? original.instrumento.toString();

    // 1. Emitir el nuevo certificado (valida completitud y unicidad antes de tocar el original).
    const nuevo = await this.create(
      { ...dto.nuevaCalibracion, instrumentoId },
      userId,
      ipAddress,
      userAgent,
    );

    // 2. Marcar el original como anulado (solo campos de estado; el contenido sellado no cambia).
    const fechaAnulacion = new Date();
    await this.calibracionModel.updateOne(
      { _id: original._id },
      {
        $set: {
          anulado: true,
          motivoAnulacion: motivo,
          fechaAnulacion,
          anuladoPor: userId,
          certificadoReemplazadoPor: nuevo.id,
        },
      },
    );
    await this.calibracionModel.updateOne({ _id: nuevo.id }, { $set: { reemplazaA: original._id } });

    if (this.certificadoModel) {
      try {
        await this.certificadoModel.updateOne(
          { calibracion: original._id } as any,
          { $set: { estado: EstadoCertificado.ANULADO, motivoAnulacion: motivo } },
        );
      } catch (err) {
        this.logger.warn(`No se pudo anular el certificado espejo: ${err}`);
      }
    }

    await this.auditService.logEvent({
      userId,
      actionType: TipoAccionAuditoria.ANNUL,
      entityAffected: EntidadAfectada.CALIBRACION,
      identifier: original.numeroCertificado,
      previousState: { anulado: false, numeroCertificado: original.numeroCertificado },
      newState: {
        anulado: true,
        motivoAnulacion: motivo,
        reemplazadoPor: nuevo.numeroCertificado,
        certificadoReemplazadoPor: nuevo.id,
      },
      ipAddress,
      userAgent,
      descripcion: `Anulación formal del certificado ${original.numeroCertificado}; reemplazado por ${nuevo.numeroCertificado}. Motivo: ${motivo}`,
    });

    return this.findById(nuevo.id);
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

    // Por defecto: fecha de emisión (createdAt) descendente, así el certificado recién emitido
    // aparece primero. `_id` desempata de forma estable para que la paginación no repita ni omita filas.
    const SORTABLE = ['createdAt', 'fechaCalibracion', 'fechaProximaCalibracion', 'numeroCertificado'];
    const sortField = query.sortBy && SORTABLE.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortOrder?.toLowerCase() === 'asc' ? 1 : -1;
    const sortOption: Record<string, 1 | -1> = { [sortField]: sortDirection };
    if (sortField !== '_id') sortOption._id = sortDirection;

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

    if (calibracion.bloqueadoInmutable) {
      throw new ForbiddenException(
        'Este certificado de calibración se encuentra sellado e inmutable. No se permiten modificaciones posteriores a su emisión.',
      );
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

    if (calibracion.bloqueadoInmutable) {
      throw new ForbiddenException(
        'Este certificado de calibración se encuentra sellado e inmutable. No se permite la eliminación de registros certificados.',
      );
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

  async generatePdf(idOrNumCertificado: string): Promise<Buffer> {
    let calibracion: any = null;
    if (isValidObjectId(idOrNumCertificado)) {
      calibracion = await this.calibracionModel
        .findById(idOrNumCertificado)
        .populate('instrumento')
        .populate('tecnico');
    }
    if (!calibracion) {
      calibracion = await this.calibracionModel
        .findOne({
          $or: [
            { numeroCertificado: idOrNumCertificado },
            { codigoFolio: idOrNumCertificado },
          ],
        })
        .populate('instrumento')
        .populate('tecnico');
    }

    if (!calibracion) {
      throw new NotFoundException(`Certificado de calibración '${idOrNumCertificado}' no encontrado.`);
    }

    const instrumento = calibracion.instrumento as any;

    let reemplazadoPorNumero: string | undefined;
    if (calibracion.anulado && calibracion.certificadoReemplazadoPor) {
      const rep: any = await this.calibracionModel.findById(calibracion.certificadoReemplazadoPor);
      reemplazadoPorNumero = rep?.numeroCertificado;
    }

    return await this.pdfGeneratorService.generateCertificadoPdf({
      numeroCertificado: calibracion.numeroCertificado,
      codigoFolio: calibracion.codigoFolio || `FOLIO-${calibracion._id}`,
      fechaEmision: calibracion.fechaCalibracion,
      fechaVencimiento: calibracion.fechaProximaCalibracion,
      laboratorioAcreditado: calibracion.laboratorioAcreditado || 'Laboratorio Metrológico Autorizado',
      // Habeas Data: el PDF es de acceso publico (QR), por eso no se imprime el nombre del tecnico.
      tecnicoNombre: 'Firma electrónica registrada',
      instrumento: {
        serial: instrumento?.serial || 'N/A',
        marca: instrumento?.marca || 'N/A',
        modelo: instrumento?.modelo || 'N/A',
        tipo: instrumento?.tipo || 'BASCULA_COMERCIAL',
        categoriaExactitud: instrumento?.categoriaExactitud || 'CLASE_III',
        capacidadMaxima: instrumento?.capacidadMaxima || 0,
        capacidadMinima: instrumento?.capacidadMinima || 0,
        unidadMedida: instrumento?.unidadMedida || 'kg',
        divisionEscala: instrumento?.divisionEscala,
        codigoPrecintoSIMEL: calibracion.codigoPrecintoSIMEL || instrumento?.codigoPrecintoSIMEL,
      },
      resultado: calibracion.resultado,
      patronesUtilizados: (calibracion.patronesUtilizados || []).map((p: any) => ({
        codigoPatron: p.codigoPatron,
        descripcion: p.descripcion,
        certificadoTrazabilidad: p.certificadoTrazabilidad,
        fechaVencimientoPatron: p.fechaVencimientoPatron,
      })),
      erroresMaximosPermitidos: (calibracion.erroresMaximosPermitidos || []).map((e: any) => ({
        cargaNominal: e.cargaNominal,
        errorEncontrado: e.errorEncontrado,
        errorMaximoPermitido: e.errorMaximoPermitido,
        cumple: e.cumple,
      })),
      // QR firmado con HMAC-SHA256 sobre cert+serial (HU-05).
      verificationUrl: buildSignedVerificationUrl(
        process.env.PUBLIC_APP_URL || 'http://localhost:5173',
        calibracion.numeroCertificado,
        instrumento?.serial || '',
      ),
      anulado: calibracion.anulado === true,
      reemplazadoPorNumero,
    });
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
      anulado: doc.anulado === true,
      motivoAnulacion: doc.motivoAnulacion,
      fechaAnulacion: doc.fechaAnulacion,
      certificadoReemplazadoPor: doc.certificadoReemplazadoPor?.toString(),
      reemplazaA: doc.reemplazaA?.toString(),
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
