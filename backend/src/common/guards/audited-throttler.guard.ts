import { ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, getOptionsToken, getStorageToken } from '@nestjs/throttler';
import type {
  ThrottlerLimitDetail,
  ThrottlerRequest,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { AuditService } from '../../modules/audit/audit.service.js';
import {
  EntidadAfectada,
  TipoAccionAuditoria,
} from '../../schemas/trazabilidad-evento.schema.js';

/**
 * Throttler que, ademas de responder 429, deja constancia de cada bloqueo en la
 * bitacora de auditoria como AUTH_FAILURE (escenario S2: fuerza bruta en login).
 */
@Injectable()
export class AuditedThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    reflector: Reflector,
    @Optional() @Inject(AuditService) private readonly auditService?: AuditService,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Ventana deslizante por clave (IP + ruta). Se registra cada intento al entrar (asi una
   * rafaga concurrente tampoco supera el limite) y se DEVUELVE el cupo si la respuesta
   * termina con exito (<400): solo los intentos fallidos cuentan (escenario S2 / F6b).
   */
  private readonly intentos = new Map<string, number[]>();

  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, getTracker, generateKey, throttler } = requestProps;
    const { req, res } = this.getRequestResponse(context);

    const tracker = await getTracker(req, context);
    const key = generateKey(context, tracker, throttler.name ?? 'default');
    const ahora = Date.now();
    const vigentes = (this.intentos.get(key) ?? []).filter((t) => ahora - t < ttl);

    if (vigentes.length >= limit) {
      this.intentos.set(key, vigentes);
      const masAntiguo = vigentes[0] ?? ahora;
      const timeToExpire = Math.max(1, Math.ceil((masAntiguo + ttl - ahora) / 1000));
      if (typeof res?.header === 'function') {
        res.header('Retry-After', timeToExpire);
      } else if (typeof res?.setHeader === 'function') {
        res.setHeader('Retry-After', timeToExpire);
      }
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits: vigentes.length + 1,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: timeToExpire,
      });
      return false;
    }

    const marca = ahora + Math.random() / 1000; // unica por intento
    vigentes.push(marca);
    this.intentos.set(key, vigentes);

    res?.once?.('finish', () => {
      if ((res.statusCode ?? 500) < 400) {
        const actuales = this.intentos.get(key);
        if (!actuales) return;
        const restantes = actuales.filter((t) => t !== marca);
        if (restantes.length) this.intentos.set(key, restantes);
        else this.intentos.delete(key);
      }
    });
    return true;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    if (this.auditService) {
      const req = context.switchToHttp().getRequest();
      const email =
        typeof req?.body?.email === 'string' ? req.body.email.toLowerCase().trim() : undefined;
      const ip = req?.ip || req?.socket?.remoteAddress;
      await this.auditService
        .logEvent({
          actionType: TipoAccionAuditoria.AUTH_FAILURE,
          entityAffected: EntidadAfectada.USUARIO,
          identifier: email || ip || 'RATE_LIMITED',
          ipAddress: ip,
          userAgent: req?.headers?.['user-agent'],
          descripcion: `Solicitud bloqueada (HTTP 429): demasiados intentos en [${req?.method} ${req?.originalUrl || req?.url}] desde ${ip}. Límite ${detail.limit} por ${Math.round(detail.ttl / 1000)} s.`,
        })
        .catch(() => undefined);
    }
    return super.throwThrottlingException(context, detail);
  }
}
