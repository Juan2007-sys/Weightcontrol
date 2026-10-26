import { NivelAlerta } from '../../../schemas/alerta.schema.js';

export interface AlertaResponseDto {
  id: string;
  instrumento: any;
  serial: string;
  marca: string;
  modelo: string;
  fechaProximaCalibracion: Date;
  diasRestantes: number | null;
  nivelCriticidad: NivelAlerta;
  mensaje: string;
  canalesNotificados: string[];
  leida: boolean;
  despachada: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
