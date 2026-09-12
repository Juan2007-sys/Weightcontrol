# 📌 CONTEXTO MAESTRO DEL PROYECTO: WeightControl
> **Instrucciones para el Asistente IA (Claude / ChatGPT / Cursor):**  
> Actúa como Arquitecto de Software Senior y Desarrollador Full-Stack experto en sistemas de metrología legal, arquitectura limpia, patrones de diseño GoF y principios SOLID. Utiliza las especificaciones, reglas de negocio y restricciones técnicas descritas a continuación como verdad absoluta para cualquier implementación de código, diseño de endpoints, modelos de datos, pruebas unitarias o documentación.

---

## 1. Visión General del Producto y Dominio

* **Nombre del Sistema:** `WeightControl` (Plataforma de Gestión de Datos y Validación de Certificación de Instrumentos de Pesaje).
* **Propósito:** Centralizar, validar, emitir alertas y garantizar la trazabilidad inalterable de los instrumentos de pesaje (básculas comerciales, pesas patrón y dinamómetros), resolviendo la dispersión de información y la falta de sistemas unificados de inspección en Colombia.
* **Marco Normativo Colombiano Obligatorio:**
  1. **NTC 2031:** Requisitos técnicos, metrológicos y de exactitud para instrumentos de pesaje de funcionamiento no automático (IPFNA). Categorías de exactitud: *Clase I (Especial), Clase II (Fina), Clase III (Media), Clase IIII (Ordinaria)*.
  2. **Decreto 1074 de 2015 (Capítulo Metrología Legal):** Obligatoriedad de calibraciones periódicas, precintos de seguridad (SIMEL / reparadores inscritos), control metrológico y trazabilidad nacional ante la SIC.
  3. **ISO/IEC 27001 & Habeas Data:** Protección de datos personales de técnicos y entidades, cifrado y respaldo inmutable de pistas de auditoría.

---

## 2. Stack Tecnológico y Arquitectura

* **Frontend:** React.js (SPA modular, gestión de estado, consumo HTTP/HTTPS mediante Axios/Fetch).
* **Backend:** Node.js con Express.js (Arquitectura por capas, API RESTful, respuestas estructuradas en JSON).
* **Base de Datos Principal:** MongoDB (Base de datos NoSQL documental, flexible y escalable).
* **Caché y Rendimiento:** Redis (Caché en memoria para optimizar lecturas frecuentes: consultas públicas por serial, estado de sesión y parámetros maestros).
* **Seguridad:** Autenticación vía JWT, contraseñas hasheadas con bcrypt, cifrado en tránsito (HTTPS) y en reposo (AES-256).

---

## 3. Modelo C4 del Sistema

### 3.1 Nivel 1: Contexto
El sistema interactúa con 6 actores clave:
1. **Administrador del Sistema:** Gestión total de usuarios, asignación de roles, permisos y parámetros maestros del sistema.
2. **Técnico Certificado:** Registro de equipos, carga de especificaciones técnicas, precintos, reparaciones e informes de calibración.
3. **Institución de Acreditación (ej. ONAC / Laboratorios Calibradores):** Valida y acredita calibraciones, precintos y certificaciones metrológicas.
4. **Instituciones Auditoras:** Inspección y consulta de reportes de cumplimiento, evidencias y trazabilidad en modo de solo lectura.
5. **SIC (Superintendencia de Industria y Comercio):** Ente de control nacional que fiscaliza el cumplimiento normativo e investiga irregularidades.
6. **Ciudadano (Acceso Público):** Consulta libre sin login del estado de vigencia y certificación de un instrumento mediante su número de serie.

### 3.2 Nivel 2: Contenedores
* **Web App (React.js):** Provee interfaces diferenciadas por rol (Paneles de administración, captura técnica, validación visual y buscador público).
* **API REST (Node.js/Express):** Expone endpoints protegidos por middleware RBAC (Role-Based Access Control) y orquesta la lógica de negocio y validaciones normativas.
* **MongoDB:** Persiste las colecciones de `Usuarios`, `Instrumentos`, `Calibraciones`, `Certificados` y `Trazabilidad_Eventos`.
* **Redis:** Caché de lectura rápida para consultas públicas y datos de configuración global.

### 3.3 Nivel 3: Componentes del Backend
* **Auth & Access Control Component:** Emisión/validación de JWT y middleware de autorización según roles.
* **Instrument Management Component:** CRUD y consulta de equipos de pesaje.
* **Validation Component (NTC 2031 Engine):** Motor especializado en contrastar las características técnicas con la norma.
* **Alert & Notification Engine:** Detección de vencimientos (a 30, 15 y 5 días) y despacho de alertas multicanal.
* **Calibration & Certificate Issuer:** Orquestador de calibraciones y emisión de certificados digitales con código único de verificación.
* **Audit & Traceability Component:** Registro asíncrono e inmutable de eventos.
* **Data Access Layer (Repository Pattern):** Abstracción desacoplada de consultas a MongoDB y Redis.

---

## 4. Reglas de Negocio Críticas

### 4.1 Ciclo de Estados de un Instrumento
* **Vigente:** Última calibración válida y fecha de vencimiento posterior al umbral de aviso.
* **Por vencer:** Fecha actual dentro de los **30 días de anticipación** a la próxima calibración (parámetro maestro editable por el Admin).
* **Vencido:** Fecha actual igual o superior a la fecha de próxima calibración.
* **REGLA DE BLOQUEO:** Un instrumento con estado `Vencido` **no puede recibir emisión de certificados digitales de operación regular** hasta que un técnico/laboratorio cargue una nueva calibración conforme.

### 4.2 Validación Automática NTC 2031 (Al momento de registrar/editar)
1. **Capacidad máxima ($Max$):** Debe ser un valor numérico estrictamente mayor a cero ($Max > 0$).
2. **División de escala ($d$ o $e$):** Requerida para balanzas; la relación $Max/e$ define el número de divisiones de verificación $n$.
3. **Coherencia temporal:** La `fechaProximaCalibracion` debe ser estrictamente posterior a la `fechaUltimaCalibracion`.
4. **Unicidad de Serial:** No pueden coexistir dos equipos registrados con el mismo número de serie físico.
5. **Integridad de Precinto:** Debe registrarse el código del reparador/precinto inscrito en SIMEL. Si un dato no pasa la regla, el registro se rechaza de inmediato con el desglose de errores.

### 4.3 Trazabilidad Inmutable (Audit Log)
Cualquier acción relevante (login, alta de equipo, modificación de parámetros, generación de certificado o cambio de calibración) dispara un evento con:
* `timestamp` (ISO UTC y hora local).
* `userId` y `userRole`.
* `actionType` (CREATE, UPDATE, GENERATE_CERT, AUTH_FAILURE, etc.).
* `entityAffected` e `identifier` (ej. serial o código de folio).
* `previousState` y `newState` (diferencias de datos).

---

## 5. Principios SOLID y Patrones GoF Implementados

Al sugerir o refactorizar código, debes mantener estrictamente estos patrones:

| Principio / Patrón | Aplicación en WeightControl | Ejemplo de Código / Estructura |
| :--- | :--- | :--- |
| **OCP (Open/Closed)** | Las reglas de validación varían según el tipo de instrumento sin modificar el servicio de registro. | Interfaz o clase abstracta `ReglaValidacion` con subclases `ReglaBascula`, `ReglaPesa`, `ReglaDinamometro`. Agregar un equipo nuevo = agregar una clase. |
| **ISP (Interface Segregation)** | Separación de contratos por perfiles de usuario para evitar interfaces monolíticas. | Subdividir en interfaces delgadas: `RegistradorInstrumento` (Técnico), `ConsultorAuditoria` (Auditor/SIC), `AdministradorSistema` (Admin). |
| **LSP (Liskov Substitution)** | Subtipos de `Instrumento` sustituyen al tipo base sin romper el cálculo de vencimientos o validaciones. | `Instrumento` define `calcularVencimiento()`; `Bascula` y `Dinamometro` lo implementan con sus fórmulas sin arrojar excepciones imprevistas. |
| **Strategy (GoF)** | Canales de notificación intercambiables y dinámicos para las alertas. | `CanalNotificacion` implementado por `EmailNotificador`, `SistemaNotificador`, `WhatsAppNotificador`. El servicio despacha por cualquier estrategia. |
| **Observer (GoF)** | Desacople ante eventos de cambio de estado metrológico. | `Equipo` (Sujeto) notifica a observadores registrados (`PanelAlertas`, `MotorNotificaciones`, `RegistroTrazabilidad`) ante cambios de estado. |
| **Factory Method (GoF)** | Emisión de certificados digitales desacoplada del controlador. | `CertificadoFactory` con factorías concretas `CertificadoPdfFactory` y `CertificadoExcelFactory`, encapsulando la asignación del UUID/folio. |
| **Decorator (GoF)** | Composición modular de certificados con sellos opcionales. | `CertificadoDecorator` envuelve la emisión base para añadir capas dinámicas: `ConFirmaDigital(ConMarcaAgua(certificadoBase))`. |

---

## 6. Esquemas y Modelos de Datos (Boceto Mongoose / Documental)

### Instrumento (`InstrumentoSchema`)
```typescript
{
  serial: { type: String, required: true, unique: true, index: true },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  tipo: { type: String, enum: ['Bascula', 'Pesa', 'Dinamometro'], required: true },
  categoriaExactitud: { type: String, enum: ['Clase I', 'Clase II', 'Clase III', 'Clase IIII'], required: true },
  capacidadMaxima: { type: Number, required: true }, // en kg o g según unidad
  divisionEscala: { type: Number },
  codigoPrecintoSIMEL: { type: String },
  fechaUltimaCalibracion: { type: Date, required: true },
  fechaProximaCalibracion: { type: Date, required: true },
  estado: { type: String, enum: ['Vigente', 'Por vencer', 'Vencido'], default: 'Vigente' },
  creadoPor: { type Schema.Types.ObjectId, ref: 'Usuario' }
}