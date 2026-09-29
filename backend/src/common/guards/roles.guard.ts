import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { RolUsuario } from '../../schemas/usuario.schema.js';
import { AuditService } from '../../modules/audit/audit.service.js';
import {
  TipoAccionAuditoria,
  EntidadAfectada,
} from '../../schemas/trazabilidad-evento.schema.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(AuditService) private readonly auditService?: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers ? req.headers['user-agent'] : undefined;
    const method = req?.method || 'UNKNOWN';
    const url = req?.originalUrl || req?.url || 'UNKNOWN_ROUTE';

    if (!user || !user.rol) {
      if (this.auditService) {
        await this.auditService.logEvent({
          userId: user?.id || user?.sub,
          userRole: user?.rol || 'ANONYMOUS',
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          entityAffected: EntidadAfectada.USUARIO,
          identifier: user?.email || user?.id || 'UNAUTHORIZED_ACCESS',
          ipAddress,
          userAgent,
          descripcion: `Acceso denegado (HTTP 403): Usuario no autenticado o sin rol intentó acceder a [${method} ${url}]. Roles requeridos: [${requiredRoles.join(', ')}]`,
        }).catch(() => {});
      }
      throw new ForbiddenException('No tiene permisos para acceder a este recurso.');
    }

    const hasRole = requiredRoles.includes(user.rol);
    if (!hasRole) {
      if (this.auditService) {
        await this.auditService.logEvent({
          userId: user.id || user.sub || (user._id ? String(user._id) : undefined),
          userRole: user.rol,
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          entityAffected: EntidadAfectada.USUARIO,
          identifier: user.email || user.id || 'FORBIDDEN_ATTEMPT',
          ipAddress,
          userAgent,
          descripcion: `Acceso denegado (HTTP 403): Usuario [${user.email || user.nombre || user.id}] con rol [${user.rol}] intentó acceder a [${method} ${url}]. Roles autorizados: [${requiredRoles.join(', ')}]`,
        }).catch(() => {});
      }
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
