---
name: nestjs-enterprise-patterns
description: Guía de arquitectura enterprise, patrones de diseño, inyección de dependencias, DTO validation, filtros de excepción, Mongoose y seguridad para NestJS en WeightControl.
---

# NestJS Enterprise Patterns · WeightControl Backend Architecture

Esta skill documenta los estándares arquitectónicos, patrones de diseño y directrices de seguridad para el desarrollo del backend en **NestJS 12**, **Mongoose 9** y **TypeScript**.

---

## 1. Estructura Modular y Clean Architecture

Cada módulo de dominio (ej. `instrumentos`, `calibraciones`, `auth`, `alertas`) debe estructurarse con separación clara de responsabilidades:

```
src/modules/[dominio]/
├── dto/                    # Data Transfer Objects con class-validator estricto
├── entities/               # Interfaces de dominio y tipos de negocio
├── schemas/                # Esquemas de Mongoose con índices y hooks
├── validators/             # Motores de validación pura (sin acoplamiento a HTTP/BD)
├── [dominio].controller.ts # Capa HTTP: Enrutamiento, Swagger, @UseGuards
├── [dominio].service.ts    # Lógica de negocio y orquestación
└── [dominio].module.ts     # Registro del módulo y exportaciones
```

---

## 2. Validación Estricta de DTOs (`ValidationPipe`)

En `main.ts` y controladores, siempre aplicar validación global estricta:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,               // Remueve automáticamente campos no declarados
    forbidNonWhitelisted: true,    // Lanza error 400 si envían propiedades extra
    transform: true,               // Transforma tipos automáticamente (string -> number/Date)
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### Reglas para DTOs:
* Todo campo numérico metrológico debe tener `@IsNumber()`, `@Min()`, `@Max()`.
* Las capacidades deben validarse con un validador personalizado para garantizar $Min < Max$.
* Los seriales deben normalizarse con `@Transform(({ value }) => value?.trim()?.toUpperCase())`.

---

## 3. Control de Acceso Basado en Roles (RBAC) y Seguridad

1. **Decorador de Roles:** Usar `@Roles(RolUsuario.ADMIN, RolUsuario.TECNICO)`.
2. **Guardias Globales o por Controlador:** `@UseGuards(JwtAuthGuard, RolesGuard)`.
3. **Manejo de Acceso Denegado (403):** El `RolesGuard` debe rechazar peticiones no autorizadas y registrar el evento en la colección de trazabilidad/auditoría.
4. **Endpoints Públicos:** Usar el decorador `@Public()` y retornar exclusivamente DTOs de proyección pública (`PublicVerificationDto`) para cumplir con **Habeas Data (Ley 1581 de 2012)**.

---

## 4. Persistencia Mongoose e Índices Únicos

* **Índice Único de Serial:** `@Prop({ required: true, unique: true, uppercase: true, trim: true, index: true }) serial: string;`.
* **Captura de Errores de Base de Datos:** Los servicios deben atrapar el error `code === 11000` de MongoDB y traducirlo inmediatamente a `ConflictException` (HTTP 409) con mensaje explícito.
* **Soft Delete:** Para inactivar usuarios o instrumentos sin romper la trazabilidad histórica, usar `activo: boolean` en lugar de `findByIdAndDelete()`.

---

## 5. Streaming y Generación de PDF / QR

* Los servicios de PDF (usando `pdfkit` / `canvas` / `qrcode`) deben retornar un `Buffer` o `ReadableStream`.
* Los controladores deben configurar las cabeceras:
  ```typescript
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="certificado.pdf"')
  ```
* En el frontend, el cliente HTTP debe consumir la respuesta usando `response.blob()`.
