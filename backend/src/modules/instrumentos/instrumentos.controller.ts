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
import { InstrumentosService } from './instrumentos.service.js';
import { CreateInstrumentoDto } from './dto/create-instrumento.dto.js';
import { UpdateInstrumentoDto } from './dto/update-instrumento.dto.js';
import { InstrumentoResponseDto } from './dto/instrumento-response.dto.js';
import { QueryInstrumentosDto } from './dto/query-instrumentos.dto.js';
import { PaginatedResponseDto } from './dto/paginated-response.dto.js';
import { InstrumentoStatsDto } from './dto/instrumento-stats.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';

@Controller('instrumentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstrumentosController {
  constructor(private readonly instrumentosService: InstrumentosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO, RolUsuario.INSTITUCION_ACREDITACION)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateInstrumentoDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<InstrumentoResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.instrumentosService.create(createDto, userId, ipAddress, userAgent);
  }

  @Get()
  async findAll(
    @Query() query: QueryInstrumentosDto,
  ): Promise<PaginatedResponseDto<InstrumentoResponseDto>> {
    return this.instrumentosService.findAll(query);
  }

  @Get('stats/summary')
  async getStats(): Promise<InstrumentoStatsDto> {
    return this.instrumentosService.getStats();
  }

  @Public()
  @Get('public/search')
  async publicSearch(
    @Query('serial') serial: string,
  ): Promise<InstrumentoResponseDto> {
    return this.instrumentosService.findBySerial(serial);
  }

  @Public()
  @Get('serial/:serial')
  async findBySerial(
    @Param('serial') serial: string,
  ): Promise<InstrumentoResponseDto> {
    return this.instrumentosService.findBySerial(serial);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<InstrumentoResponseDto> {
    return this.instrumentosService.findById(id);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInstrumentoDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<InstrumentoResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.instrumentosService.update(id, updateDto, userId, ipAddress, userAgent);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.TECNICO)
  async patch(
    @Param('id') id: string,
    @Body() updateDto: UpdateInstrumentoDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<InstrumentoResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.instrumentosService.update(id, updateDto, userId, ipAddress, userAgent);
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
    return this.instrumentosService.delete(id, userId, ipAddress, userAgent);
  }
}
