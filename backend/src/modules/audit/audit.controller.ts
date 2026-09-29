import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditService, QueryAuditDto } from './audit.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.AUDITOR, RolUsuario.SIC)
  async findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }

  @Get('security-events')
  @Roles(RolUsuario.ADMIN, RolUsuario.AUDITOR, RolUsuario.SIC)
  async getSecurityEvents(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 10;
    return this.auditService.getRecentSecurityEvents(numLimit);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.AUDITOR, RolUsuario.SIC)
  async findById(@Param('id') id: string) {
    return this.auditService.findById(id);
  }
}
