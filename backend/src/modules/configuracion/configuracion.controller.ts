import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';
import {
  ConfiguracionService,
  UMBRAL_ALERTA_MAX,
  UMBRAL_ALERTA_MIN,
} from './configuracion.service.js';

export class UpdateUmbralAlertaDto {
  @IsInt({ message: 'El umbral debe ser un número entero de días.' })
  @Min(UMBRAL_ALERTA_MIN, { message: `El umbral mínimo es ${UMBRAL_ALERTA_MIN} día.` })
  @Max(UMBRAL_ALERTA_MAX, { message: `El umbral máximo es ${UMBRAL_ALERTA_MAX} días.` })
  umbralDias: number;
}

@Controller('configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get('alertas')
  async getAlertas(): Promise<{ umbralDias: number }> {
    return { umbralDias: await this.configuracionService.getUmbralDias() };
  }

  @Put('alertas')
  @Roles(RolUsuario.ADMIN)
  async setAlertas(
    @Body() dto: UpdateUmbralAlertaDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<{ umbralDias: number }> {
    return this.configuracionService.setUmbralDias(
      dto.umbralDias,
      userId,
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent'],
    );
  }
}
