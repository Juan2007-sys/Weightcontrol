import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Usuario, UsuarioDocument, RolUsuario } from '../../../schemas/usuario.schema.js';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  nombre: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'super_secret_jwt_key_weightcontrol_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usuarioModel.findById(payload.sub).lean();

    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe en el sistema.');
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario se encuentra inactivo.');
    }

    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      documentoIdentidad: user.documentoIdentidad,
      numeroRegistroSIMEL: user.numeroRegistroSIMEL,
      tarjetaProfesional: user.tarjetaProfesional,
      entidad: user.entidad,
      telefono: user.telefono,
      activo: user.activo,
    };
  }
}
