import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsuariosService } from './usuarios.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { QueryUsuariosDto } from './dto/query-usuarios.dto.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateUsuarioDto,
    @CurrentUser('id') adminUserId: string,
    @Req() req: Request,
  ): Promise<UsuarioResponseDto> {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    return this.usuariosService.create(createDto, adminUserId, ipAddress, userAgent);
  }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async findAll(@Query() query: QueryUsuariosDto) {
    return this.usuariosService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN)
  async findById(@Param('id') id: string): Promise<UsuarioResponseDto> {
    return this.usuariosService.findById(id);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUsuarioDto,
    @CurrentUser('id') adminUserId: string,
    @Req() req: Request,
  ): Promise<UsuarioResponseDto> {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    return this.usuariosService.update(id, updateDto, adminUserId, ipAddress, userAgent);
  }

  @Patch(':id/status')
  @Roles(RolUsuario.ADMIN)
  async changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @CurrentUser('id') adminUserId: string,
    @Req() req: Request,
  ): Promise<UsuarioResponseDto> {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    return this.usuariosService.changeStatus(
      id,
      changeStatusDto,
      adminUserId,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Req() req: Request,
  ): Promise<{ message: string; id: string }> {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    return this.usuariosService.delete(id, adminUserId, ipAddress, userAgent);
  }
}
