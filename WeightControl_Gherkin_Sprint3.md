# WeightControl · Escenarios Gherkin · Sprint 3


---

## Diapositiva 1

ESCENARIOS
GHERKIN
SPRINT 3 · HU-11 → HU-16
- **GIVEN**
- **WHEN**
- **THEN**
WeightControl: un escenario principal y uno alternativo por cada historia de usuario.
WEIGHTCONTROL · ARQUITECTURA DE SOFTWARE · GUÍA DE LABORATORIO 7

---

## Diapositiva 2


### HU-11 · PRINCIPAL

Gestión avanzada de usuarios y roles
COMO Administrador.
QUIERO gestionar los usuarios y asignarles roles y permisos específicos.
PARA QUE PUEDA controlar el acceso y proteger la información del sistema.

`Feature: Gestión avanzada de usuarios y roles Scenario: Registrar un usuario con rol Técnico`

- **GIVEN**
el administrador está en la gestión de usuarios
- **WHEN**
ingresa nombre, correo y el rol "Técnico"
- **AND**
guarda el nuevo usuario
- **THEN**
el usuario queda activo con el rol asignado
- **AND**
la acción queda registrada
WEIGHTCONTROL · SPRINT 3 · HU-11

---

## Diapositiva 3


### HU-11 · ALTERNATIVO

Gestión avanzada de usuarios y roles
COMO Administrador.
QUIERO gestionar los usuarios y asignarles roles y permisos específicos.
PARA QUE PUEDA controlar el acceso y proteger la información del sistema.

`Feature: Gestión avanzada de usuarios y roles Scenario: Auditor intenta modificar un equipo`

- **GIVEN**
un usuario autenticado con rol "Auditor"
- **WHEN**
intenta editar los datos de un equipo
- **THEN**
el sistema rechaza la acción
- **AND**
no se modifica ningún dato
- **AND**
el intento queda registrado
WEIGHTCONTROL · SPRINT 3 · HU-11

---

## Diapositiva 4

DESCRIPCIÓN
HU
Como Técnico autorizado, quiero incorporar una firma a los certificados de calibración para garantizar la identificación del responsable y la autenticidad.

**12.**
ESCENARIO PRINCIPAL
Firmar un certificado de calibración
FIRMA ELECTRÓNICA O DIGITAL DE CERTIFICADOS
ESCENARIO ALTERNATIVO
Usuario sin permiso intenta firmar
WEIGHTCONTROL · SPRINT 3 · HU-12

---

## Diapositiva 5


### HU-12 · PRINCIPAL

Firma electrónica o digital de certificados
COMO Técnico autorizado.
QUIERO incorporar una firma a los certificados de calibración.
PARA QUE PUEDA garantizar la identificación del responsable y la autenticidad.

`Feature: Firma electrónica o digital de certificados Scenario: Firmar un certificado de calibración`

- **GIVEN**
el técnico tiene permiso para firmar
- **AND**
existe un certificado generado sin firmar
- **WHEN**
el técnico firma el certificado
- **THEN**
el certificado muestra firmante, fecha y hora
- **AND**
la firma queda en el historial
WEIGHTCONTROL · SPRINT 3 · HU-12

---

## Diapositiva 6


### HU-12 · ALTERNATIVO

Firma electrónica o digital de certificados
COMO Técnico autorizado.
QUIERO incorporar una firma a los certificados de calibración.
PARA QUE PUEDA garantizar la identificación del responsable y la autenticidad.

`Feature: Firma electrónica o digital de certificados Scenario: Usuario sin permiso intenta firmar`

- **GIVEN**
un usuario sin permiso de firma
- **WHEN**
intenta firmar un certificado
- **THEN**
el sistema rechaza la firma
- **AND**
el certificado no se modifica
WEIGHTCONTROL · SPRINT 3 · HU-12

---

## Diapositiva 7

DESCRIPCIÓN
HU
Como Usuario autorizado o entidad verificadora, quiero consultar la autenticidad de un certificado mediante un código QR para comprobar que fue generado por WeightControl y es un registro válido.

**13.**
ESCENARIO PRINCIPAL
Verificar un certificado con QR válido
VERIFICACIÓN DE CERTIFICADOS MEDIANTE CÓDIGO QR
ESCENARIO ALTERNATIVO
QR que no corresponde a un certificado
WEIGHTCONTROL · SPRINT 3 · HU-13

---

## Diapositiva 8


### HU-13 · PRINCIPAL

Verificación de certificados mediante código QR
COMO Usuario autorizado o entidad verificadora.
QUIERO consultar la autenticidad de un certificado mediante un código QR.
PARA QUE PUEDA comprobar que fue generado por WeightControl y es un registro válido.

`Feature: Verificación de certificados mediante código QR Scenario: Verificar un certificado con QR válido`

- **GIVEN**
un certificado emitido con su código QR
- **WHEN**
el usuario escanea el QR desde su celular
- **THEN**
ve el serial, la fecha de emisión y el estado
- **AND**
el estado es "Vigente"
- **AND**
no ve información confidencial
WEIGHTCONTROL · SPRINT 3 · HU-13

---

## Diapositiva 9


### HU-13 · ALTERNATIVO

Verificación de certificados mediante código QR
COMO Usuario autorizado o entidad verificadora.
QUIERO consultar la autenticidad de un certificado mediante un código QR.
PARA QUE PUEDA comprobar que fue generado por WeightControl y es un registro válido.

`Feature: Verificación de certificados mediante código QR Scenario: QR que no corresponde a un certificado`

- **GIVEN**
un código QR que no está registrado
- **WHEN**
el usuario lo escanea
- **THEN**
el sistema informa que no es un certificado registrado
- **AND**
muestra el estado "No válido"
WEIGHTCONTROL · SPRINT 3 · HU-13

---

## Diapositiva 10

DESCRIPCIÓN
HU
Como Administrador, quiero configurar notificaciones por correo sobre calibraciones y vencimientos para mantener informados a los responsables de los eventos importantes.

**14.**
ESCENARIO PRINCIPAL
Aviso de calibración próxima a vencer
NOTIFICACIONES AUTOMÁTICAS POR CORREO ELECTRÓNICO
ESCENARIO ALTERNATIVO
Falla en el envío del correo
WEIGHTCONTROL · SPRINT 3 · HU-14

---

## Diapositiva 11


### HU-14 · PRINCIPAL

Notificaciones automáticas por correo electrónico
COMO Administrador.
QUIERO configurar notificaciones por correo sobre calibraciones y vencimientos.
PARA QUE PUEDA mantener informados a los responsables de los eventos importantes.

`Feature: Notificaciones automáticas por correo electrónico Scenario: Aviso de calibración próxima a vencer`

- **GIVEN**
hay destinatarios y días de aviso configurados
- **AND**
un equipo con calibración próxima a vencer
- **WHEN**
se ejecuta el proceso de notificaciones
- **THEN**
se envía un correo con serial y fecha
- **AND**
el envío queda registrado como exitoso
WEIGHTCONTROL · SPRINT 3 · HU-14

---

## Diapositiva 12


### HU-14 · ALTERNATIVO

Notificaciones automáticas por correo electrónico
COMO Administrador.
QUIERO configurar notificaciones por correo sobre calibraciones y vencimientos.
PARA QUE PUEDA mantener informados a los responsables de los eventos importantes.

`Feature: Notificaciones automáticas por correo electrónico Scenario: Falla en el envío del correo`

- **GIVEN**
una notificación pendiente de enviar
- **WHEN**
el servidor de correo no responde
- **THEN**
el sistema registra el envío con error
- **AND**
informa el fallo al administrador
WEIGHTCONTROL · SPRINT 3 · HU-14

---

## Diapositiva 13

DESCRIPCIÓN
HU
Como Administrador, quiero visualizar indicadores y estadísticas de equipos y calibraciones para conocer el estado de la gestión metrológica y decidir mejor.

**15.**
ESCENARIO PRINCIPAL
Ver los indicadores generales
PANEL DE INDICADORES Y ESTADÍSTICAS
ESCENARIO ALTERNATIVO
Filtrar por rango de fechas
WEIGHTCONTROL · SPRINT 3 · HU-15

---

## Diapositiva 14


### HU-15 · PRINCIPAL

Panel de indicadores y estadísticas
COMO Administrador.
QUIERO visualizar indicadores y estadísticas de equipos y calibraciones.
PARA QUE PUEDA conocer el estado de la gestión metrológica y decidir mejor.

`Feature: Panel de indicadores y estadísticas Scenario: Ver los indicadores generales`

- **GIVEN**
el administrador inicia sesión
- **WHEN**
abre el panel de indicadores
- **THEN**
ve equipos activos e inactivos
- **AND**
ve calibraciones realizadas, pendientes y vencidas
- **AND**
ve los certificados emitidos en gráficos
WEIGHTCONTROL · SPRINT 3 · HU-15

---

## Diapositiva 15


### HU-15 · ALTERNATIVO

Panel de indicadores y estadísticas
COMO Administrador.
QUIERO visualizar indicadores y estadísticas de equipos y calibraciones.
PARA QUE PUEDA conocer el estado de la gestión metrológica y decidir mejor.

`Feature: Panel de indicadores y estadísticas Scenario: Filtrar por rango de fechas`

- **GIVEN**
el administrador está en el panel
- **WHEN**
selecciona un rango de fechas
- **THEN**
los indicadores se recalculan según el rango seleccionado
- **AND**
puede consultar el detalle por tipo de equipo
WEIGHTCONTROL · SPRINT 3 · HU-15

---

## Diapositiva 16

DESCRIPCIÓN
HU
Como Administrador, quiero integrar WeightControl con sistemas externos mediante API REST para intercambiar información y evitar registros duplicados.

**16.**
ESCENARIO PRINCIPAL
Sincronizar un registro por API REST
INTEGRACIÓN CON SISTEMAS EXTERNOS
ESCENARIO ALTERNATIVO
Solicitud sin autorización
WEIGHTCONTROL · SPRINT 3 · HU-16

---

## Diapositiva 17


### HU-16 · PRINCIPAL

Integración con sistemas externos
COMO Administrador.
QUIERO integrar WeightControl con sistemas externos mediante API REST.
PARA QUE PUEDA intercambiar información y evitar registros duplicados.

`Feature: Integración con sistemas externos Scenario: Sincronizar un registro por API REST`

- **GIVEN**
una conexión externa autorizada
- **WHEN**
el sistema externo envía un equipo válido
- **THEN**
WeightControl lo procesa y responde
- **AND**
registra la solicitud y la respuesta
WEIGHTCONTROL · SPRINT 3 · HU-16

---

## Diapositiva 18


### HU-16 · ALTERNATIVO

Integración con sistemas externos
COMO Administrador.
QUIERO integrar WeightControl con sistemas externos mediante API REST.
PARA QUE PUEDA intercambiar información y evitar registros duplicados.

`Feature: Integración con sistemas externos Scenario: Solicitud sin autorización`

- **GIVEN**
un sistema externo sin credenciales válidas
- **WHEN**
envía una solicitud a la API
- **THEN**
el sistema responde 401 o 403
- **AND**
no intercambia datos
- **AND**
registra el intento
WEIGHTCONTROL · SPRINT 3 · HU-16

---

## Diapositiva 19

CONCLUSIÓN

**1.**

**2.**

**3.**
Herramienta poderosa
Mejora la comunicación
Aplicación efectiva
Gherkin define comportamientos y escenarios de prueba de forma clara y estructurada.
Reduce malentendidos entre equipos y asegura que se cumplan las expectativas de los usuarios.

### HU-11 a HU-16: roles, firma, QR, notificaciones, indicadores e integraciones.

WEIGHTCONTROL · ARQUITECTURA DE SOFTWARE · GUÍA DE LABORATORIO 7
