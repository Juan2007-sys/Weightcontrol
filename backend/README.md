# 🚀 WeightControl - Backend API

> **API REST y Motor de Validación Metrológica para Instrumentos de Pesaje**  
> Desarrollado con [NestJS](https://nestjs.com/) v12, [TypeScript](https://www.typescriptlang.org/), [Mongoose / MongoDB](https://mongoosejs.com/) y [Redis](https://redis.io/).

---

## 📋 Tabla de Contenidos
1. [Descripción y Propósito](#-descripción-y-propósito)
2. [Arquitectura y Estructura del Backend](#-arquitectura-y-estructura-del-backend)
3. [Esquemas y Modelos de Datos (Mongoose)](#-esquemas-y-modelos-de-datos-mongoose)
4. [Variables de Entorno (`.env`)](#-variables-de-entorno-env)
5. [Instalación y Ejecución](#-instalación-y-ejecución)
6. [Pruebas (Testing)](#-pruebas-testing)
7. [Cómo Levantar las Bases de Datos con Docker](#-cómo-levantar-las-bases-de-datos-con-docker)
8. [Marco Normativo y Reglas de Negocio](#-marco-normativo-y-reglas-de-negocio)

---

## 📖 Descripción y Propósito

El backend de **WeightControl** gestiona la lógica de negocio, autenticación, control de acceso basado en roles (RBAC), validaciones metrológicas según la norma colombiana **NTC 2031**, control de precintos **SIMEL**, alertas tempranas de vencimiento y registro inmutable de pistas de auditoría conforme a **ISO/IEC 27001**.

---

## 🏗️ Arquitectura y Estructura del Backend

El backend está organizado por capas y módulos desacoplados:

```text
backend/
├── src/
│   ├── database/
│   │   └── database.module.ts       # Módulo que registra todos los esquemas en Mongoose
│   ├── schemas/                     # Modelos y esquemas de Mongoose con TypeScript
│   │   ├── usuario.schema.ts        # Colección: usuarios (RBAC y credenciales)
│   │   ├── instrumento.schema.ts    # Colección: instrumentos (Básculas, Pesas, Dinamómetros)
│   │   ├── calibracion.schema.ts    # Colección: calibraciones (Informes y patrones)
│   │   ├── certificado.schema.ts    # Colección: certificados (Folio único y firma digital)
│   │   ├── trazabilidad-evento.schema.ts # Colección: trazabilidad_eventos (Audit log inmutable)
│   │   └── index.ts                 # Exportador centralizado de esquemas y enums
│   ├── app.controller.ts            # Controlador base
│   ├── app.service.ts               # Servicio base
│   ├── app.module.ts                # Módulo raíz (ConfigModule + MongooseModule + DatabaseModule)
│   └── main.ts                      # Punto de entrada de la aplicación
├── test/                            # Pruebas e2e y unitarias con Vitest
├── .env.example                     # Plantilla de variables de entorno
├── .env                             # Variables de entorno locales (ignorado por Git)
├── package.json                     # Dependencias y scripts
└── tsconfig.json                    # Configuración TypeScript
```

---

## 🗄️ Esquemas y Modelos de Datos (Mongoose)

Los esquemas residen en [`src/schemas/`](./src/schemas/) y aplican las especificaciones de [`../CONTEXT.md`](../CONTEXT.md):

### 1. `Usuario` (`usuarios`)
- **Campos:** `nombre`, `email` (único), `password` (hasheada, oculta en consultas), `rol`, `documentoIdentidad`, `numeroRegistroSIMEL`, `tarjetaProfesional`, `entidad`, `telefono`, `activo`.
- **Roles (Enum `RolUsuario`):**
  - `ADMIN`: Control total del sistema y parámetros maestros.
  - `TECNICO`: Registro de instrumentos, precintos e informes de calibración.
  - `INSTITUCION_ACREDITACION`: Acreditación metrológica (ONAC / Laboratorios).
  - `AUDITOR`: Inspección de evidencias y trazabilidad en solo lectura.
  - `SIC`: Ente de fiscalización nacional (Superintendencia de Industria y Comercio).
  - `CIUDADANO`: Consulta pública de instrumentos por serial.

### 2. `Instrumento` (`instrumentos`)
- **Campos:** `serial` (único, indexado), `marca`, `modelo`, `tipo` (`Bascula`, `Pesa`, `Dinamometro`), `categoriaExactitud` (`Clase I`, `Clase II`, `Clase III`, `Clase IIII`), `capacidadMaxima` ($Max > 0$), `unidadMedida` (`kg`, `g`, `t`, `lb`, `N`, `kN`), `divisionEscala` ($d$ o $e$), `numeroDivisionesVerificacion` ($n = Max / e$), `codigoPrecintoSIMEL`, `propietario`, `ubicacionFisica`, `fechaUltimaCalibracion`, `fechaProximaCalibracion`, `estado`.
- **Estados Metrológicos (Enum `EstadoInstrumento`):**
  - `Vigente`: Calibración al día.
  - `Por vencer`: Dentro del umbral de alerta (30 días).
  - `Vencido`: Fecha actual $\ge$ Próxima calibración (bloquea la emisión de certificados regulares).

### 3. `Calibracion` (`calibraciones`)
- **Campos:** `instrumento` (ObjectId ref), `tecnico` (ObjectId ref), `laboratorioAcreditado`, `numeroCertificado` (único), `fechaCalibracion`, `fechaProximaCalibracion`, `resultado` (`Conforme`, `No Conforme`), `codigoPrecintoSIMEL`, `patronesUtilizados`, `erroresMaximosPermitidos`, `incertidumbreExpandida`, `observaciones`, `archivoInformeUrl`.

### 4. `Certificado` (`certificados`)
- **Campos:** `codigoFolio` (UUID / Hash único), `instrumento` (ref), `calibracion` (ref), `emitidoPor` (ref), `tipoCertificado` (`Calibracion`, `Inspeccion`, `ConformidadMetrologica`), `fechaEmision`, `fechaVencimiento`, `codigoQR`, `firmaDigital` (`firmante`, `cargo`, `fechaFirma`, `hashFirma`), `sellosAplicados` (Decorator: ej. `ConFirmaDigital`, `SelloSIMEL`), `estado` (`Valido`, `Anulado`, `Expirado`).

### 5. `TrazabilidadEvento` (`trazabilidad_eventos`)
- **Propósito:** Registro inmutable de eventos de auditoría (ISO/IEC 27001).
- **Campos:** `timestamp`, `userId` (ref), `userRole`, `actionType` (`CREATE`, `UPDATE`, `DELETE`, `GENERATE_CERT`, `CALIBRATE`, `STATUS_CHANGE`, `AUTH_LOGIN`, `AUTH_FAILURE`, `INSPECTION`), `entityAffected` (`Instrumento`, `Calibracion`, `Certificado`, `Usuario`, `Configuracion`), `identifier` (serial o folio), `previousState`, `newState`, `ipAddress`, `userAgent`, `descripcion`.

---

## ⚙️ Variables de Entorno (`.env`)

Crea tu archivo `.env` en la carpeta `backend/` a partir de `.env.example`:

```bash
cp .env.example .env
```

| Variable | Descripción | Valor por Defecto Local |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha de la API | `3000` |
| `MONGODB_URI` | Cadena de conexión hacia MongoDB (Docker) | `mongodb://admin:adminpassword123@localhost:27018/weightcontrol?authSource=admin` |
| `MONGODB_DB_NAME` | Nombre de la base de datos | `weightcontrol` |
| `REDIS_HOST` | Host del servidor Redis | `localhost` |
| `REDIS_PORT` | Puerto del servidor Redis | `6379` |
| `JWT_SECRET` | Clave secreta para firma de tokens JWT | *(Clave secreta)* |
| `JWT_EXPIRES_IN` | Tiempo de expiración de sesión JWT | `24h` |

---

## 📦 Instalación y Ejecución

```bash
# 1. Instalar dependencias con compatibilidad de paquetes
npm install --legacy-peer-deps

# 2. Iniciar en modo desarrollo con recarga en vivo (Watch Mode)
npm run start:dev

# 3. Compilar TypeScript para producción
npm run build

# 4. Ejecutar la compilación de producción
npm run start:prod
```

---

## 🧪 Pruebas (Testing)

El proyecto utiliza **Vitest** como motor de pruebas de alta velocidad:

```bash
# Ejecutar pruebas unitarias
npm run test

# Ejecutar pruebas en modo observador
npm run test:watch

# Ejecutar cobertura de código (Coverage)
npm run test:cov

# Ejecutar pruebas End-to-End
npm run test:e2e
```

---

## 🐳 Cómo Levantar las Bases de Datos con Docker

El proyecto utiliza **Docker Compose** para aprovisionar automáticamente **MongoDB 7.0** y **Redis 7.0**, junto con sus paneles de administración web.

### 1. Iniciar los Servicios de Base de Datos
Desde la **raíz del proyecto `Weightcontrol/`** (un nivel arriba de `backend/`), ejecuta:

```bash
docker compose up -d
```

### 2. Verificar el Estado de los Contenedores
Para asegurarte de que los contenedores están corriendo y saludables (*healthy*):

```bash
docker compose ps
```

### 3. Servicios y Accesos Disponibles

| Servicio | Tecnología | URL / Host Local | Credenciales por Defecto |
| :--- | :--- | :--- | :--- |
| **MongoDB** | Base de Datos Principal | `localhost:27018` | Usuario: `admin`<br>Password: `adminpassword123`<br>AuthSource: `admin`<br>DB: `weightcontrol` |
| **Redis** | Caché en Memoria | `localhost:6379` | Sin contraseña por defecto |
| **Mongo Express** | Panel Web de MongoDB | **[http://localhost:8081](http://localhost:8081)** | Acceso libre en desarrollo |
| **Redis Commander** | Panel Web de Redis | **[http://localhost:8082](http://localhost:8082)** | Acceso libre en desarrollo |

---

### 🧭 Conexión desde MongoDB Compass
Para conectarte visualmente desde MongoDB Compass:
1. Abre MongoDB Compass.
2. Pega el siguiente **Connection String** y haz clic en **Connect**:
   ```text
   mongodb://admin:adminpassword123@localhost:27018/weightcontrol?authSource=admin
   ```

---

### 🛠️ Comandos Útiles de Docker

```bash
# Ver logs en tiempo real de MongoDB:
docker compose logs -f mongodb

# Ver logs en tiempo real de Redis:
docker compose logs -f redis

# Reiniciar los servicios:
docker compose restart

# Detener los contenedores (los datos persisten en los volúmenes):
docker compose down

# Detener y eliminar volúmenes (⚠️ borra los datos de prueba):
docker compose down -v
```

---

## ⚖️ Marco Normativo y Reglas de Negocio

Para conocer la totalidad de los requerimientos metrológicos, modelos C4 y patrones GoF aplicados al sistema, consulta el documento maestro:
👉 **[`../CONTEXT.md`](../CONTEXT.md)**.

