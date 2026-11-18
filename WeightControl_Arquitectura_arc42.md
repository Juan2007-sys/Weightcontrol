# WeightControl · Arquitectura arc42


---

## Diapositiva 1

DOCUMENTACIÓN DE ARQUITECTURA · ARC42
WeightControl
Gestión y validación de certificación de instrumentos de pesaje en Colombia
Arquitectura de Software · Semana 11

---

## Diapositiva 2

MARCO DE TRABAJO
arc42 ordena la arquitectura en 12 secciones
1–4
5–7
8–12
El problema y la estrategia
Tres vistas del sistema
Criterios y calidad
Objetivos, restricciones, contexto y estrategia
Bloques, ejecución y despliegue
Conceptos, decisiones, calidad, riesgos y glosario
WeightControl · arc42

**02.**

---

## Diapositiva 3


**01.**

### 01 · RESUMEN DE REQUISITOS

Seis funciones definen el sistema

**01.**

**02.**
Registrar y validar equipos
Registrar calibraciones

**03.**

**04.**
Emitir certificados con QR
Alertar vencimientos

**05.**

**06.**
Auditar cada cambio
Consultar por serial, sin login
WeightControl · arc42

**03.**

---

## Diapositiva 4


**01.**

### 01 · REGLA DE NEGOCIO

Un instrumento vencido no se puede certificar
Vencido
Vigente
Por vencer
Sin certificado hasta recalibrar
Calibración al día
Faltan 30 días o menos
Una calibración conforme devuelve el equipo a Vigente.
WeightControl · arc42

**04.**

---

## Diapositiva 5


**01.**

### 01 · OBJETIVOS DE CALIDAD

Cinco metas de calidad guían el diseño
Trazabilidad
Cada cambio queda auditado
Seguridad
JWT, roles y cifrado
Cumplimiento
NTC 2031 y Decreto 1074
Extensibilidad
Un tipo de equipo, un validador
Usabilidad
Consulta pública, sin login
WeightControl · arc42

**05.**

---

## Diapositiva 6


**01.**

### 01 · STAKEHOLDERS

Seis actores usan WeightControl
Administrador
Técnico
Acreditadora
Configura el sistema
Registra calibraciones
Valida certificaciones
Auditores
SIC
Ciudadano
Consultan evidencias
Fiscaliza el cumplimiento
Verifica sin iniciar sesión
WeightControl · arc42

**06.**

---

## Diapositiva 7


**02.**

### 02 · RESTRICCIONES

Tres normas fijan las reglas del diseño
NTC 2031
Decreto 1074
ISO 27001
Clases de exactitud y validación de cada equipo
Calibración periódica y precintos SIMEL
Protección de datos y auditoría inmutable
NestJS · React · MongoDB
Stack ya definido
WeightControl · arc42

**07.**

---

## Diapositiva 8


**03.**

### 03 · CONTEXTO DE NEGOCIO

Seis actores rodean un solo sistema
Administrador
Auditores
Configura usuarios
Consultan, solo lectura
Técnico
SIC
WeightControl
Registra equipos
Fiscaliza el cumplimiento
El sistema
Acreditadora
Ciudadano
Valida calibraciones
Verifica por serial
WeightControl · arc42 · nivel 1 del modelo C4

**08.**

---

## Diapositiva 9


**03.**

### 03 · CONTEXTO TÉCNICO

La API es la única puerta a los datos
HTTPS
REST + JWT
Mongoose
API NestJS
Navegador
Web App
MongoDB
Lógica de negocio
Usuarios
React + Vite
En la nube
La API prepara las alertas por correo (envío simulado). El QR del certificado abre la consulta pública.
WeightControl · arc42

**09.**

---

## Diapositiva 10


**04.**

### 04 · ESTRATEGIA DE SOLUCIÓN

Cinco decisiones, cinco metas
API por módulos
Extensibilidad
Un validador por tipo de equipo
Cumplimiento
JWT, roles y límite de login
Seguridad
Auditoría de cada cambio
Trazabilidad
QR firmado y consulta sin login
Usabilidad
WeightControl · arc42

**10.**

---

## Diapositiva 11


**05.**

### 05 · VISTA DE BLOQUES

Tres capas separan interfaz, lógica y datos
Web App · React 19 + Vite
Siete vistas según el rol del usuario
API · NestJS 12
REST · JSON · JWT
auth
usuarios
instrumentos
calibraciones
alertas
audit
configuracion
indicadores
integraciones
MongoDB
Mongoose
Diez colecciones: usuarios, instrumentos, calibraciones, certificados, trazabilidad_eventos, alertas, configuraciones, notificaciones_email, conexiones_externas y sync_logs
WeightControl · arc42 · nivel 2 del modelo C4

**11.**

---

## Diapositiva 12


**05.**

### 05 · PATRÓN STRATEGY

Strategy: nuevas reglas sin tocar el núcleo
Báscula
Pesa
Dinamómetro
Motor de validación
Correo
Sistema
Auditoría
Motor de alertas
Agregar un tipo o un canal nuevo es agregar una clase. El canal de correo soporta envío real vía webhook/Resend (con fallback local, deduplicación e historial en `notificaciones_email`).
WeightControl · arc42

**12.**

---

## Diapositiva 13


**06.**

### 06 · VISTA DE EJECUCIÓN · ESCENARIO 1

Registrar una calibración toma seis pasos

**1.**

**2.**

**3.**

**4.**

**5.**

**6.**
Solicitud
Autorización
Validación
Persistencia
Auditoría
Certificado
El PDF con QR firmado se genera cuando se solicita.
WeightControl · arc42

**13.**

---

## Diapositiva 14


**06.**

### 06 · VISTA DE EJECUCIÓN · ESCENARIO 2

Cualquier ciudadano verifica un equipo sin login
Escanea el QR o escribe el serial
La API responde sin pedir sesión
Ve el estado y los datos públicos
La firma HMAC del QR prueba que el certificado es auténtico.
WeightControl · arc42

**14.**

---

## Diapositiva 15


**06.**

### 06 · VISTA DE EJECUCIÓN · ESCENARIO 3

Cada medianoche el sistema revisa los vencimientos
Despacha por canales
Cron diario
Revisa las fechas
Crea alertas
Canales: correo (simulado),sistema y auditoría.
WeightControl · arc42

**15.**

---

## Diapositiva 16


**07.**

### 07 · VISTA DE DESPLIEGUE

El frontend y los datos viven en la nube
Navegador
Vercel
API NestJS
MongoDB Atlas
HTTPS
Web App React
Render
Base en la nube
Desarrollo local
Docker Compose · Vite 5173 · NestJS 3000 · MongoDB 27018 · Redis 6379
WeightControl · arc42

**16.**

---

## Diapositiva 17


**08.**

### 08 · CONCEPTOS TRANSVERSALES

Seis reglas valen para todo el sistema
Seguridad
Auditoría
Validación
JWT, roles y límite de login
Un evento por cada cambio
DTOs y reglas NTC 2031
Ciclo de estados
Datos públicos
Pruebas
Vigente, Por vencer, Vencido
DTO reducido sin sesión
Vitest, e2e y propiedades
WeightControl · arc42

**17.**

---

## Diapositiva 18


**09.**

### 09 · DECISIONES ARQUITECTÓNICAS

Cada decisión tiene una razón
NestJS por módulos
Estructura clara e inyección de dependencias
MongoDB documental
Esquema flexible por tipo de equipo
JWT sin estado
La API escala sin sesiones en servidor
Patrón Strategy
Reglas y canales nuevos sin tocar el núcleo
QR firmado con HMAC
Autenticidad sin guardar estado
WeightControl · arc42

**18.**

---

## Diapositiva 19


**10.**

### 10 · REQUISITOS DE CALIDAD

Árbol de calidad
Seguridad
Límite de intentos de login con auditoría
Trazabilidad
Usuario y estado previo por cada cambio
Calidad
Cumplimiento
Validación NTC 2031 al registrar un equipo
Extensibilidad
Equipo nuevo, validador nuevo
Usabilidad
Verificación pública y login accesible
WeightControl · arc42

**19.**

---

## Diapositiva 20


**10.**

### 10 · ESCENARIOS DE CALIDAD

Cinco escenarios medibles
ATRIBUTO
ESTÍMULO
RESPUESTA
Seguridad
Más de 5 intentos de login en un minuto
Responde 429 y el intento queda auditado
Trazabilidad
Un técnico modifica un equipo
Se guarda usuario, estado previo y nuevo
Cumplimiento
Se registra un equipo con datos inválidos
Se rechaza con el desglose de errores
Extensibilidad
Llega un tipo de equipo nuevo
Se agrega un validador, sin tocar el registro
Usabilidad
Un ciudadano consulta un serial
Ve el estado sin iniciar sesión
WeightControl · arc42 · naranja: escenario de cambio, verde: de uso

**20.**

---

## Diapositiva 21


**11.**

### 11 · RIESGOS Y DEUDA TÉCNICA

Dos deudas y dos riesgos siguen abiertos
DEUDA TÉCNICA
RIESGOS
Redis configurado, pero sin uso
QR_SIGNING_SECRET soportado de forma independiente a JWT_SECRET (mitigado en código; definir en .env de producción)
Medida: integrar caché o retirarlo
Medida: definir QR_SIGNING_SECRET en despliegue
Falta el canal de WhatsApp
Dependencia del proveedor en la nube
Medida: agregar otra estrategia
Medida: respaldos periódicos
WeightControl · arc42

**21.**

---

## Diapositiva 22


**12.**

### 12 · GLOSARIO

Ocho términos para hablar el mismo idioma
NTC 2031
RBAC
Norma técnica para básculas y pesas
Control de acceso basado en roles
IPFNA
JWT
Instrumento de pesaje no automático
Token firmado que identifica al usuario
SIMEL
Strategy
Registro de precintos y reparadores
Patrón para intercambiar algoritmos
SIC
ONAC
Superintendencia de Industria y Comercio
Organismo Nacional de Acreditación
WeightControl · arc42

**22.**

---

## Diapositiva 23

CONCLUSIÓN
Una arquitectura documentada se audita, se mantiene y crece
arc42 ordena el porqué de WeightControl.
Gracias · Preguntas
