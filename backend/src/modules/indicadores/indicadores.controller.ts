import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';
import { IndicadoresService } from './indicadores.service.js';
import { QueryIndicadoresDto } from './dto/query-indicadores.dto.js';

@Controller('indicadores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IndicadoresController {
  constructor(private readonly indicadoresService: IndicadoresService) {}

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.AUDITOR, RolUsuario.SIC)
  async getIndicadores(@Query() query: QueryIndicadoresDto) {
    return this.indicadoresService.getPanelIndicadores(query);
  }
}
