import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CalibracionesService } from './calibraciones.service.js';
import { CreateCalibracionDto } from './dto/create-calibracion.dto.js';
import { UpdateCalibracionDto } from './dto/update-calibracion.dto.js';
import { QueryCalibracionesDto } from './dto/query-calibraciones.dto.js';
import { CalibracionResponseDto } from './dto/calibracion-response.dto.js';
import { PaginatedResponseDto } from '../instrumentos/dto/paginated-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';

@Controller('calibraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalibracionesController {
  constructor(private readonly calibracionesService: CalibracionesService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO, RolUsuario.INSTITUCION_ACREDITACION)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCalibracionDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<CalibracionResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.calibracionesService.create(createDto, userId, ipAddress, userAgent);
  }

  @Get()
  async findAll(
    @Query() query: QueryCalibracionesDto,
  ): Promise<PaginatedResponseDto<CalibracionResponseDto>> {
    return this.calibracionesService.findAll(query);
  }

  @Get('instrumento/:instrumentoId')
  async findByInstrumento(
    @Param('instrumentoId') instrumentoId: string,
  ): Promise<CalibracionResponseDto[]> {
    return this.calibracionesService.findByInstrumento(instrumentoId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<CalibracionResponseDto> {
    return this.calibracionesService.findById(id);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCalibracionDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<CalibracionResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.calibracionesService.update(id, updateDto, userId, ipAddress, userAgent);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO)
  async patch(
    @Param('id') id: string,
    @Body() updateDto: UpdateCalibracionDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<CalibracionResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.calibracionesService.update(id, updateDto, userId, ipAddress, userAgent);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<{ message: string; id: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.calibracionesService.delete(id, userId, ipAddress, userAgent);
  }
}
