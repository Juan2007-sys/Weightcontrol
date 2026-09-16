import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import {
  Usuario,
  UsuarioDocument,
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/index.js';
import { AuditService } from '../audit/audit.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const existingUser = await this.usuarioModel.findOne({
      email: registerDto.email.toLowerCase().trim(),
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario registrado con este correo electrónico.',
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const newUser = new this.usuarioModel({
      ...registerDto,
      email: registerDto.email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // Registro de auditoría (ISO/IEC 27001)
    await this.auditService.logEvent({
      userId: savedUser._id.toString(),
      userRole: savedUser.rol,
      actionType: TipoAccionAuditoria.CREATE,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: savedUser._id.toString(),
      newState: {
        id: savedUser._id.toString(),
        email: savedUser.email,
        rol: savedUser.rol,
        nombre: savedUser.nombre,
      },
      ipAddress,
      userAgent,
      descripcion: `Usuario registrado: ${savedUser.email} con rol ${savedUser.rol}`,
    });

    return this.generateAuthResponse(savedUser);
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    const user = await this.usuarioModel
      .findOne({ email: normalizedEmail })
      .select('+password');

    if (!user) {
      await this.auditService.logEvent({
        actionType: TipoAccionAuditoria.AUTH_FAILURE,
        entityAffected: EntidadAfectada.USUARIO,
        identifier: normalizedEmail,
        ipAddress,
        userAgent,
        descripcion: `Intento de inicio de sesión fallido para email no existente: ${normalizedEmail}`,
      });
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.activo) {
      await this.auditService.logEvent({
        userId: user._id.toString(),
        userRole: user.rol,
        actionType: TipoAccionAuditoria.AUTH_FAILURE,
        entityAffected: EntidadAfectada.USUARIO,
        identifier: user._id.toString(),
        ipAddress,
        userAgent,
        descripcion: `Intento de inicio de sesión de usuario inactivo: ${user.email}`,
      });
      throw new UnauthorizedException(
        'El usuario se encuentra inactivo. Por favor contacte al administrador.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.auditService.logEvent({
        userId: user._id.toString(),
        userRole: user.rol,
        actionType: TipoAccionAuditoria.AUTH_FAILURE,
        entityAffected: EntidadAfectada.USUARIO,
        identifier: user._id.toString(),
        ipAddress,
        userAgent,
        descripcion: `Contraseña incorrecta para el usuario: ${user.email}`,
      });
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Registro de auditoría de inicio de sesión exitoso
    await this.auditService.logEvent({
      userId: user._id.toString(),
      userRole: user.rol,
      actionType: TipoAccionAuditoria.AUTH_LOGIN,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: user._id.toString(),
      ipAddress,
      userAgent,
      descripcion: `Inicio de sesión exitoso para: ${user.email}`,
    });

    return this.generateAuthResponse(user);
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.usuarioModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario se encuentra inactivo.');
    }

    return this.sanitizeUser(user);
  }

  private async generateAuthResponse(
    user: UsuarioDocument,
  ): Promise<AuthResponseDto> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    };

    const expiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '24h';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_SECRET') ||
        'super_secret_jwt_key_weightcontrol_2026',
      expiresIn: expiresIn as any,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: UsuarioDocument): UserResponseDto {
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
