import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChangeStatusDto {
  @IsNotEmpty({ message: 'El campo activo es obligatorio.' })
  @IsBoolean({ message: 'El campo activo debe ser booleano.' })
  activo: boolean;

  @IsOptional()
  @IsString()
  motivo?: string;
}
