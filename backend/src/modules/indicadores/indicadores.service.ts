import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Instrumento,
  InstrumentoDocument,
  Calibracion,
  CalibracionDocument,
  Certificado,
  CertificadoDocument,
  EstadoInstrumento,
  EstadoCertificado,
} from '../../schemas/index.js';
import { QueryIndicadoresDto } from './dto/query-indicadores.dto.js';

export interface PanelIndicadoresResponse {
  equipos: {
    total: number;
    activos: number;
    inactivos: number;
    porEstado: {
      Vigente: number;
      'Por vencer': number;
      Vencido: number;
    };
    porTipo: Array<{ tipo: string; cantidad: number }>;
  };
  calibraciones: {
    realizadas: number;
    pendientes: number;
    vencidas: number;
  };
  certificados: {
    emitidos: number;
    vigentes: number;
    anulados: number;
  };
  filtrosAplicados: {
    fechaInicio: string | null;
    fechaFin: string | null;
    tipoEquipo: string | null;
  };
}

@Injectable()
export class IndicadoresService {
  constructor(
    @InjectModel(Instrumento.name)
    private readonly instrumentoModel: Model<InstrumentoDocument>,
    @InjectModel(Calibracion.name)
    private readonly calibracionModel: Model<CalibracionDocument>,
    @InjectModel(Certificado.name)
    private readonly certificadoModel: Model<CertificadoDocument>,
  ) {}

  async getPanelIndicadores(
    query: QueryIndicadoresDto = {},
  ): Promise<PanelIndicadoresResponse> {
    const instFilter: Record<string, any> = {};
    if (query.tipoEquipo && query.tipoEquipo.trim() !== '') {
      instFilter.tipo = query.tipoEquipo.trim();
    }

    const instrumentos = await this.instrumentoModel.find(instFilter).lean().exec();
    const instrumentoIds = instrumentos.map((i: any) => i._id);

    const activos = instrumentos.filter((i: any) => i.activo !== false).length;
    const inactivos = instrumentos.length - activos;

    const porEstado = {
      Vigente: 0,
      'Por vencer': 0,
      Vencido: 0,
    };
    const tipoMap = new Map<string, number>();

    for (const inst of instrumentos as any[]) {
      if (inst.estado === EstadoInstrumento.VIGENTE) porEstado.Vigente++;
      else if (inst.estado === EstadoInstrumento.POR_VENCER) porEstado['Por vencer']++;
      else if (inst.estado === EstadoInstrumento.VENCIDO) porEstado.Vencido++;

      const tipo = String(inst.tipo || 'OTRO');
      tipoMap.set(tipo, (tipoMap.get(tipo) ?? 0) + 1);
    }

    const porTipo = Array.from(tipoMap.entries()).map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
    }));

    // Rango de fechas para calibraciones y certificados
    const dateRange: Record<string, Date> = {};
    if (query.fechaInicio) dateRange.$gte = new Date(query.fechaInicio);
    if (query.fechaFin) {
      const fin = new Date(query.fechaFin);
      fin.setUTCHours(23, 59, 59, 999);
      dateRange.$lte = fin;
    }

    const calFilter: Record<string, any> = { anulado: { $ne: true } };
    const certFilter: Record<string, any> = {};

    if (query.tipoEquipo && query.tipoEquipo.trim() !== '') {
      calFilter.instrumento = { $in: instrumentoIds };
      certFilter.instrumento = { $in: instrumentoIds };
    }
    if (Object.keys(dateRange).length > 0) {
      calFilter.fechaCalibracion = dateRange;
      certFilter.fechaEmision = dateRange;
    }

    const [calibracionesRealizadas, certificados] = await Promise.all([
      this.calibracionModel.countDocuments(calFilter).exec(),
      this.certificadoModel.find(certFilter).lean().exec(),
    ]);

    const certificadosEmitidos = certificados.length;
    const certificadosVigentes = certificados.filter(
      (c: any) => c.estado === EstadoCertificado.VALIDO,
    ).length;
    const certificadosAnulados = certificados.filter(
      (c: any) => c.estado === EstadoCertificado.ANULADO,
    ).length;

    return {
      equipos: {
        total: instrumentos.length,
        activos,
        inactivos,
        porEstado,
        porTipo,
      },
      calibraciones: {
        realizadas: calibracionesRealizadas,
        pendientes: porEstado['Por vencer'],
        vencidas: porEstado.Vencido,
      },
      certificados: {
        emitidos: certificadosEmitidos,
        vigentes: certificadosVigentes,
        anulados: certificadosAnulados,
      },
      filtrosAplicados: {
        fechaInicio: query.fechaInicio || null,
        fechaFin: query.fechaFin || null,
        tipoEquipo: query.tipoEquipo?.trim() || null,
      },
    };
  }
}
