import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertasService } from './alertas.service.js';
import { QueryAlertasDto } from './dto/query-alertas.dto.js';
import { AlertaResponseDto } from './dto/alerta-response.dto.js';
import { AlertasStatsDto } from './dto/alertas-stats.dto.js';
import { PaginatedResponseDto } from '../instrumentos/dto/paginated-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';

@Controller('alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  async findAll(
    @Query() query: QueryAlertasDto,
  ): Promise<PaginatedResponseDto<AlertaResponseDto>> {
    return this.alertasService.findAll(query);
  }

  @Get('stats/summary')
  async getStats(): Promise<AlertasStatsDto> {
    return this.alertasService.getStats();
  }

  @Post('scan')
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO, RolUsuario.INSTITUCION_ACREDITACION)
  @HttpCode(HttpStatus.OK)
  async scan(
    @CurrentUser('id') userId: string,
  ): Promise<{
    totalEscaneados: number;
    alertasGeneradas: number;
    alertas: AlertaResponseDto[];
  }> {
    return this.alertasService.scanAlertas(userId);
  }

  @Patch('read-all')
  async markAllAsRead(): Promise<{ modifiedCount: number }> {
    return this.alertasService.markAllAsRead();
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string): Promise<AlertaResponseDto> {
    return this.alertasService.markAsRead(id);
  }

  @Post(':id/dispatch')
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO)
  async dispatchAlerta(
    @Param('id') id: string,
  ): Promise<{ success: boolean; canales: string[] }> {
    return this.alertasService.dispatchAlerta(id);
  }
}
