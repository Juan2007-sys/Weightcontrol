import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable, firstValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Ruta publica: se intenta autenticar (sin exigirlo) para que el controlador sepa si
      // hay sesion valida; cualquier fallo se trata como "sin sesion" (ver handleRequest).
      const resultado = super.canActivate(context);
      if (resultado instanceof Observable) {
        return firstValueFrom(resultado).catch(() => true);
      }
      return Promise.resolve(resultado).catch(() => true);
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Token ausente, invalido, expirado o de usuario inactivo => sin usuario, sin error.
      return (err || !user ? undefined : user) as TUser;
    }
    return super.handleRequest(err, user, info, context, status);
  }
}
