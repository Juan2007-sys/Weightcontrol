import {
  ResultadoCalibracion,
  PatronUtilizado,
  PuntoMedicionError,
} from '../../../schemas/calibracion.schema.js';

export interface CalibracionResponseDto {
  id: string;
  instrumento: any;
  tecnico: any;
  laboratorioAcreditado: string;
  numeroCertificado: string;
  fechaCalibracion: Date;
  fechaProximaCalibracion: Date;
  resultado: ResultadoCalibracion;
  codigoPrecintoSIMEL?: string;
  patronesUtilizados: PatronUtilizado[];
  erroresMaximosPermitidos: PuntoMedicionError[];
  incertidumbreExpandida?: string;
  observaciones?: string;
  archivoInformeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
