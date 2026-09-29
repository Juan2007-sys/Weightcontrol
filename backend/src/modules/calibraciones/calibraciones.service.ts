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

    const nuevaCalibracion = new this.calibracionModel({
      ...createDto,
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
    const tecnico = calibracion.tecnico as any;

    return await this.pdfGeneratorService.generateCertificadoPdf({
      numeroCertificado: calibracion.numeroCertificado,
      codigoFolio: calibracion.codigoFolio || `FOLIO-${calibracion._id}`,
      fechaEmision: calibracion.fechaCalibracion,
      fechaVencimiento: calibracion.fechaProximaCalibracion,
      laboratorioAcreditado: calibracion.laboratorioAcreditado || 'Laboratorio Metrológico Autorizado',
      tecnicoNombre: tecnico?.nombre || 'Técnico Metrólogo',
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
      verificationUrl: `https://weightcontrol.gov.co/verificar?serial=${encodeURIComponent(instrumento?.serial || '')}&cert=${encodeURIComponent(calibracion.numeroCertificado)}`,
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
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
