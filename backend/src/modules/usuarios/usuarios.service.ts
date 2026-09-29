import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Usuario,
  UsuarioDocument,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { QueryUsuariosDto } from './dto/query-usuarios.dto.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createDto: CreateUsuarioDto,
    adminUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UsuarioResponseDto> {
    const normalizedEmail = createDto.email.toLowerCase().trim();

    const existingUser = await this.usuarioModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario registrado con este correo electrónico.',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createDto.password, saltRounds);

    const newUser = new this.usuarioModel({
      ...createDto,
      email: normalizedEmail,
      password: hashedPassword,
      activo: createDto.activo !== undefined ? createDto.activo : true,
    });

    const savedUser = await newUser.save();

    // Registro inmutable de auditoría (ISO 27001)
    await this.auditService.logEvent({
      userId: adminUserId || savedUser._id.toString(),
      userRole: 'ADMIN',
      actionType: TipoAccionAuditoria.CREATE,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: savedUser._id.toString(),
      newState: {
        id: savedUser._id.toString(),
        nombre: savedUser.nombre,
        email: savedUser.email,
        rol: savedUser.rol,
        activo: savedUser.activo,
      },
      ipAddress,
      userAgent,
      descripcion: `Creación administrativa de usuario [${savedUser.email}] con rol [${savedUser.rol}]`,
    });

    return this.sanitize(savedUser);
  }

  async findAll(query: QueryUsuariosDto = {}): Promise<{
    items: UsuarioResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.rol) {
      filter.rol = query.rol;
    }

    if (query.activo !== undefined && query.activo !== '') {
      filter.activo = query.activo === 'true' || query.activo === true as any;
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { nombre: regex },
        { email: regex },
        { documentoIdentidad: regex },
        { numeroRegistroSIMEL: regex },
        { entidad: regex },
      ];
    }

    const [users, total] = await Promise.all([
      this.usuarioModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.usuarioModel.countDocuments(filter).exec(),
    ]);

    return {
      items: users.map((u) => this.sanitize(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<UsuarioResponseDto> {
    const user = await this.usuarioModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }
    return this.sanitize(user);
  }

  async update(
    id: string,
    updateDto: UpdateUsuarioDto,
    adminUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UsuarioResponseDto> {
    const user = await this.usuarioModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    const previousSnapshot = {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      documentoIdentidad: user.documentoIdentidad,
      entidad: user.entidad,
      telefono: user.telefono,
    };

    if (updateDto.email) {
      const normalizedEmail = updateDto.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const emailExists = await this.usuarioModel.findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        });
        if (emailExists) {
          throw new ConflictException(
            'El correo electrónico especificado ya pertenece a otro usuario.',
          );
        }
        user.email = normalizedEmail;
      }
    }

    if (updateDto.nombre !== undefined) user.nombre = updateDto.nombre;
    if (updateDto.rol !== undefined) user.rol = updateDto.rol;
    if (updateDto.documentoIdentidad !== undefined)
      user.documentoIdentidad = updateDto.documentoIdentidad;
    if (updateDto.numeroRegistroSIMEL !== undefined)
      user.numeroRegistroSIMEL = updateDto.numeroRegistroSIMEL;
    if (updateDto.tarjetaProfesional !== undefined)
      user.tarjetaProfesional = updateDto.tarjetaProfesional;
    if (updateDto.entidad !== undefined) user.entidad = updateDto.entidad;
    if (updateDto.telefono !== undefined) user.telefono = updateDto.telefono;
    if (updateDto.activo !== undefined) user.activo = updateDto.activo;

    if (updateDto.password && updateDto.password.trim().length >= 8) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(updateDto.password, saltRounds);
    }

    const updatedUser = await user.save();

    const newSnapshot = {
      nombre: updatedUser.nombre,
      email: updatedUser.email,
      rol: updatedUser.rol,
      activo: updatedUser.activo,
      documentoIdentidad: updatedUser.documentoIdentidad,
      entidad: updatedUser.entidad,
      telefono: updatedUser.telefono,
    };

    // Auditoría ISO 27001
    await this.auditService.logEvent({
      userId: adminUserId || id,
      userRole: 'ADMIN',
      actionType: TipoAccionAuditoria.UPDATE,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: id,
      previousState: previousSnapshot,
      newState: newSnapshot,
      ipAddress,
      userAgent,
      descripcion: `Actualización de usuario [${updatedUser.email}]. Cambios realizados por el administrador.`,
    });

    return this.sanitize(updatedUser);
  }

  async changeStatus(
    id: string,
    changeStatusDto: ChangeStatusDto,
    adminUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UsuarioResponseDto> {
    const user = await this.usuarioModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    // Prevenir que el admin se inactive a sí mismo por accidente
    if (adminUserId && adminUserId === id && !changeStatusDto.activo) {
      throw new BadRequestException(
        'No puede inactivar su propia cuenta de administrador.',
      );
    }

    const previousStatus = user.activo;
    user.activo = changeStatusDto.activo;
    const updatedUser = await user.save();

    const accionNombre = changeStatusDto.activo ? 'ACTIVADO' : 'INACTIVADO';

    // Auditoría forense de cambio de estado
    await this.auditService.logEvent({
      userId: adminUserId || id,
      userRole: 'ADMIN',
      actionType: TipoAccionAuditoria.STATUS_CHANGE,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: id,
      previousState: { activo: previousStatus },
      newState: { activo: updatedUser.activo },
      ipAddress,
      userAgent,
      descripcion: `Estado de usuario [${updatedUser.email}] cambiado a ${accionNombre}. Motivo: ${
        changeStatusDto.motivo || 'Modificación administrativa'
      }`,
    });

    return this.sanitize(updatedUser);
  }

  async delete(
    id: string,
    adminUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; id: string }> {
    const user = await this.usuarioModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    if (adminUserId && adminUserId === id) {
      throw new BadRequestException(
        'No puede eliminar su propia cuenta de administrador.',
      );
    }

    await this.usuarioModel.findByIdAndDelete(id).exec();

    await this.auditService.logEvent({
      userId: adminUserId || id,
      userRole: 'ADMIN',
      actionType: TipoAccionAuditoria.DELETE,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: id,
      previousState: {
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
      ipAddress,
      userAgent,
      descripcion: `Eliminación de cuenta de usuario [${user.email}] por el administrador`,
    });

    return {
      message: `Usuario '${user.email}' eliminado exitosamente.`,
      id,
    };
  }

  private sanitize(user: UsuarioDocument): UsuarioResponseDto {
    return {
      id: user._id.toString(),
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      documentoIdentidad: user.documentoIdentidad,
      numeroRegistroSIMEL: user.numeroRegistroSIMEL,
      tarjetaProfesional: user.tarjetaProfesional,
      entidad: user.entidad,
      telefono: user.telefono,
      activo: user.activo,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }
}
