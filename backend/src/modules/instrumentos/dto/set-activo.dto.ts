import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** HU-08: cambio de estado operativo Activo/Inactivo. */
export class SetActivoDto {
  @IsBoolean({ message: 'activo debe ser verdadero o falso.' })
  activo: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

/** HU-09: reemplazo de una fotografia concreta del equipo. */
export class ReemplazarEvidenciaDto {
  @IsString({ message: 'La imagen debe ser una cadena (URL o data URI).' })
  imagen: string;
}
