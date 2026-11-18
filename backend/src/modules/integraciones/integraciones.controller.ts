import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';
import { IntegracionesService } from './integraciones.service.js';
import { CreateConexionDto } from './dto/create-conexion.dto.js';
import { SincronizarEquipoDto } from './dto/sincronizar-equipo.dto.js';

@Controller('integraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  @Post('conexiones')
  @Roles(RolUsuario.ADMIN)
  async crearConexion(
    @Body() dto: CreateConexionDto,
    @CurrentUser('id') adminUserId: string,
    @Req() req: Request,
  ) {
    return this.integracionesService.crearConexion(
      dto,
      adminUserId,
      req.ip || req.socket?.remoteAddress,
      req.headers['user-agent'],
    );
  }

  @Get('conexiones')
  @Roles(RolUsuario.ADMIN)
  async listarConexiones() {
    return this.integracionesService.listarConexiones();
  }

  @Patch('conexiones/:id/estado')
  @Roles(RolUsuario.ADMIN)
  async cambiarEstado(
    @Param('id') id: string,
    @Body('activo') activo: boolean,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.integracionesService.cambiarEstadoConexion(
      id,
      Boolean(activo),
      adminUserId,
    );
  }

  /** Endpoint REST para sistemas externos (autenticado por x-sistema-codigo + x-api-key). */
  @Public()
  @Post('equipos')
  async sincronizarEquipo(
    @Headers('x-sistema-codigo') codigoSistema: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() dto: SincronizarEquipoDto,
  ) {
    return this.integracionesService.sincronizarEquipo(
      codigoSistema,
      apiKey,
      dto,
    );
  }

  @Get('historial')
  @Roles(RolUsuario.ADMIN, RolUsuario.AUDITOR)
  async getHistorial(@Query('limit') limit?: number) {
    return this.integracionesService.getHistorialSincronizaciones(limit);
  }
}
