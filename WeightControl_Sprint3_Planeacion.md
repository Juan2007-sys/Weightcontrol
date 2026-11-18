# WeightControl · Planeación del Sprint 3

## Planeación del Sprint 3

WeightControl · Guía de laboratorio 7 · Arquitectura de Software · Puntos 2 a 5

### Retrospectiva del Sprint 2

Borrador a validar con el acta de la reunión de retrospectiva. El Sprint 2 cubrió HU-06 a HU-10. Los campos entre corchetes son para completar con el equipo.

### Historias de usuario del Sprint 3

Objetivo del sprint: fortalecer la seguridad, la automatización y la administración de la plataforma. Las funcionalidades de calibración y resultados pueden organizarse como otro bloque de trabajo, según el alcance y la duración total del proyecto.

#### HU-11 — Gestión avanzada de usuarios y roles

Como Administrador, quiero gestionar los usuarios y asignarles roles y permisos específicos para controlar el acceso a las funcionalidades y proteger la información del sistema.

Criterios de aceptación:

Permitir registrar nuevos usuarios en el sistema.

Permitir consultar el listado de usuarios registrados.

Permitir editar la información de los usuarios.

Permitir activar o inactivar cuentas de usuario.

Permitir asignar roles a cada usuario.

Definir permisos según el rol asignado.

Contemplar roles como Administrador, Técnico y Auditor.

Restringir el acceso a funcionalidades según los permisos establecidos.

Impedir que usuarios sin autorización modifiquen información de equipos y calibraciones.

Registrar las acciones administrativas relacionadas con la gestión de usuarios.

No permitir eliminar usuarios que tengan operaciones registradas en el sistema.

#### HU-12 — Firma electrónica o digital de certificados

Como Técnico autorizado, quiero incorporar una firma electrónica o digital a los certificados de calibración para garantizar la identificación del responsable y respaldar la autenticidad del documento emitido.

Criterios de aceptación:

Permitir firmar certificados de calibración generados en el sistema.

Identificar al usuario responsable de la firma.

Validar que el usuario tenga permisos para firmar certificados.

Asociar la firma con el certificado correspondiente.

Registrar fecha y hora de la firma.

Permitir visualizar la información del firmante en el certificado.

Evitar modificaciones no autorizadas después de la firma.

Conservar la versión original del certificado firmado.

Permitir verificar el estado de la firma.

Registrar los eventos relacionados con la firma en el historial del sistema.

#### HU-13 — Verificación de autenticidad de certificados mediante código QR

Como Usuario autorizado o entidad verificadora, quiero consultar la autenticidad de un certificado mediante un código QR para comprobar que el documento fue generado por WeightControl y que corresponde a un registro válido.

Criterios de aceptación:

Generar un código QR único para cada certificado emitido.

Asociar el código QR con el número del certificado.

Incluir un mecanismo de consulta de verificación.

Permitir escanear el código QR desde un dispositivo móvil.

Mostrar la información básica del certificado.

Mostrar el número de serie del equipo asociado.

Mostrar la fecha de emisión del certificado.

Mostrar el estado del certificado (Vigente, Anulado o No válido).

Evitar que un código QR permita acceder a información confidencial.

Informar al usuario cuando el código QR no corresponda a un certificado registrado.

Permitir comprobar que el certificado consultado corresponde al documento original emitido.

#### HU-14 — Notificaciones automáticas por correo electrónico

Como Administrador, quiero configurar notificaciones automáticas por correo electrónico relacionadas con las calibraciones y vencimientos de los equipos para mantener informados a los usuarios responsables sobre los eventos importantes del sistema.

Criterios de aceptación:

Permitir configurar los destinatarios de las notificaciones.

Enviar notificaciones sobre próximas fechas de vencimiento de calibraciones.

Enviar notificaciones cuando una calibración se encuentre vencida.

Enviar notificaciones cuando se genere un nuevo certificado.

Incluir el número de serie del equipo en las notificaciones relacionadas.

Incluir la fecha correspondiente al evento notificado.

Permitir configurar anticipadamente los días de aviso de vencimiento.

Evitar el envío repetido de notificaciones para un mismo evento y periodo configurado.

Registrar el estado del envío de cada notificación.

Informar cuando se presente un error durante el envío del correo.

Permitir consultar el historial de notificaciones enviadas.

#### HU-15 — Panel de indicadores y estadísticas

Como Administrador, quiero visualizar un panel de indicadores y estadísticas de los equipos y sus procesos de calibración para conocer el estado general de la gestión metrológica y facilitar la toma de decisiones.

Criterios de aceptación:

Mostrar la cantidad total de equipos registrados.

Mostrar la cantidad de equipos activos e inactivos.

Mostrar la cantidad de calibraciones realizadas.

Mostrar la cantidad de calibraciones pendientes.

Mostrar la cantidad de calibraciones vencidas.

Mostrar la cantidad de certificados emitidos.

Diferenciar los equipos según su estado de calibración.

Permitir filtrar los indicadores por rango de fechas.

Permitir consultar estadísticas por tipo de equipo.

Actualizar los indicadores con base en la información registrada en el sistema.

Presentar los datos mediante gráficos y elementos visuales.

Restringir el acceso al panel según los permisos del usuario.

#### HU-16 — Integración con sistemas externos

Como Administrador, quiero integrar WeightControl con sistemas externos mediante servicios de comunicación para facilitar el intercambio de información y evitar la duplicación de registros entre plataformas.

Criterios de aceptación:

Permitir configurar conexiones con sistemas externos autorizados.

Permitir el intercambio de información mediante API REST.

Definir los datos que pueden enviarse y recibirse.

Validar la estructura y el formato de los datos recibidos.

Verificar la autenticación y autorización de las conexiones.

Evitar la duplicación de registros durante los procesos de integración.

Registrar las solicitudes y respuestas realizadas entre sistemas.

Informar cuando se presenten errores de comunicación.

Permitir consultar el historial de sincronizaciones.

Proteger la información intercambiada mediante mecanismos de seguridad.

Restringir la configuración de integraciones a usuarios administradores.

### Sprint Backlog del Sprint 3

Nombres de integrantes por reemplazar. Orden sugerido: HU-11, HU-12, HU-13, HU-14, HU-15 y HU-16. Los criterios de aceptación completos están en la sección 3.

#### Tareas por historia

### Planeación de pruebas

Plataforma de pruebas: Vitest 4 (pruebas unitarias, integración y propiedades) + verificación E2E en navegador. Mínimo 5 casos por historia, 32 en total.

#### Plan Maestro de Pruebas

Actualizar el Plan Maestro existente con el alcance del Sprint 3 (HU-11 a HU-16).

Niveles: pruebas unitarias, de integración y de aceptación con escenarios Gherkin.

Definir criterios de entrada y salida, y responsable de pruebas por historia.

| Tema | Contenido |

| --- | --- |

| Estrategias que han funcionado | Criterios de aceptación escritos antes de programar; prioridades en Jira según dependencias; Plan Maestro de Pruebas como guía; reutilización de validaciones de HU-01. |

| Por mejorar (grupo) | Actualizar Jira a diario; revisión entre pares antes de cerrar una historia; definición de "terminado" compartida. |

| Por mejorar (por integrante) | [Completar: una acción concreta por integrante] |

| Dificultades técnicas | HU-06 depende de los eventos que generan HU-07 y HU-08; revalidación de datos compartida con HU-01; manejo de archivos en HU-09; [completar]. |

| Dificultades de organización | Tareas sin cerrar al final del sprint; [completar]. |

| Cuellos de botella y tiempos muertos del Sprint 2 | Historias que esperan a otra sin terminar; integración de ramas al final del sprint; pruebas dejadas para el último día. |

| Posibles problemas del Sprint 3 | Casi todo depende de los roles de HU-11; HU-13 necesita certificados ya firmados (HU-12); HU-14 requiere un servicio de correo configurado; HU-16 exige seguridad y control de duplicados desde el diseño. |

| Acciones de mejora para el Sprint 3 | Empezar por HU-11; integrar a la rama principal cada dos días; pruebas de cada historia antes de cerrarla; revisión por pares; definir antes de programar el mecanismo de firma y el flujo de verificación del QR. |



| HU | Responsable | Depende de | Criterios de aceptación clave |

| --- | --- | --- | --- |

| HU-11 | Juan Quevedo | Ninguna (base de las demás) | Registrar, editar y activar o inactivar usuarios; roles Administrador, Técnico y Auditor; no eliminar usuarios con operaciones. |

| HU-12 | Jesika Pachon | HU-11 (permiso de firma), certificados | Solo firma un usuario autorizado; fecha y hora; bloquea cambios tras firmar y conserva el original. |

| HU-13 | Karen Rodriguez | HU-12 (certificado firmado) | QR único por certificado; consulta móvil con serial, fecha y estado; sin datos confidenciales. |

| HU-14 | Karen Rodriguez | HU-11, HU-13, calibraciones | Destinatarios y días de aviso configurables; sin envíos repetidos; estado e historial de envíos. |

| HU-15 | Cristian Lopez | HU-11, datos de calibraciones y certificados | Indicadores por estado, fechas y tipo de equipo; gráficos; acceso según permisos. |

| HU-16 | Cristian Lopez | HU-11 (solo administradores) | API REST autenticada; valida formato; sin duplicados; historial de sincronizaciones. |



| ID | Tarea | Responsable |

| --- | --- | --- |

| T11.1 | API de usuarios: registro, edición, activación y asignación de rol | Juan Quevedo |

| T11.2 | Permisos por rol, restricción de acceso y registro de acciones administrativas | Juan Quevedo |

| T11.3 | Vista de gestión de usuarios y pruebas | Juan Quevedo |

| T12.1 | Definir mecanismo de firma e identidad del firmante | Jesika Pachon |

| T12.2 | Servicio de firma, estado de la firma y conservación del original | Jesika Pachon |

| T12.3 | Visualización del firmante en el certificado y pruebas | Jesika Pachon |

| T13.1 | Generación del QR único y endpoint de consulta segura | Karen Rodriguez |

| T13.2 | Vista de verificación móvil con estados Vigente, Anulado y No válido | Karen Rodriguez |

| T13.3 | Contraste con el registro original y pruebas | Karen Rodriguez |

| T14.1 | Configuración de destinatarios y días de aviso | Karen Rodriguez |

| T14.2 | Envío de correos, control de repetidos y registro de estado | Karen Rodriguez |

| T14.3 | Historial de notificaciones y pruebas | Karen Rodriguez |

| T15.1 | Consultas de indicadores con filtros por fecha y tipo de equipo | Cristian Lopez |

| T15.2 | Panel con gráficos y control de acceso | Cristian Lopez |

| T15.3 | Pruebas del panel | Cristian Lopez |

| T16.1 | Configuración de conexiones externas restringida a administradores | Cristian Lopez |

| T16.2 | API REST con autenticación, validación y control de duplicados | Cristian Lopez |

| T16.3 | Registro de solicitudes, historial de sincronizaciones y pruebas | Cristian Lopez |



| ID | HU | Caso de prueba | Resultado esperado |

| --- | --- | --- | --- |

| CP-11.1 | HU-11 | Registrar usuario con rol Técnico | Queda activo con el rol y aparece en el listado; la acción se registra. |

| CP-11.2 | HU-11 | Editar los datos de un usuario y cambiar su rol | Se guardan los cambios y los permisos nuevos aplican. |

| CP-11.3 | HU-11 | Inactivar una cuenta | No puede iniciar sesión y sus operaciones históricas se conservan. |

| CP-11.4 | HU-11 | Auditor intenta modificar un equipo o una calibración | Rechaza (403), no cambia datos y registra el intento. |

| CP-11.5 | HU-11 | Eliminar un usuario con operaciones registradas | El sistema lo impide y sugiere inactivarlo. |

| CP-12.1 | HU-12 | Técnico autorizado firma un certificado | Queda firmado con firmante, fecha y hora, asociado al certificado. |

| CP-12.2 | HU-12 | Usuario sin permiso intenta firmar | Rechaza y no altera el certificado. |

| CP-12.3 | HU-12 | Modificar un certificado ya firmado | Se bloquea o la firma queda inválida; se conserva el original. |

| CP-12.4 | HU-12 | Consultar el estado de la firma | Muestra si es válida, con firmante y fecha. |

| CP-12.5 | HU-12 | Revisar el historial tras firmar | El evento de firma queda registrado. |

| CP-13.1 | HU-13 | Emitir un certificado | Se genera un QR único asociado al número del certificado. |

| CP-13.2 | HU-13 | Escanear el QR desde un celular | Abre la consulta con serial, fecha de emisión y estado. |

| CP-13.3 | HU-13 | Certificado anulado | La consulta muestra el estado "Anulado". |

| CP-13.4 | HU-13 | QR de un certificado no registrado o alterado | Informa que no corresponde a un certificado registrado. |

| CP-13.5 | HU-13 | Revisar lo que expone la consulta | No muestra información confidencial y contrasta con el registro original. |

| CP-14.1 | HU-14 | Configurar destinatarios y días de aviso | Se guardan y se aplican a las siguientes notificaciones. |

| CP-14.2 | HU-14 | Calibración próxima a vencer | Envía correo con serial y fecha de vencimiento. |

| CP-14.3 | HU-14 | Calibración vencida | Envía correo de vencimiento con serial y fecha. |

| CP-14.4 | HU-14 | Se genera un certificado nuevo | Envía correo con serial y fecha de emisión. |

| CP-14.5 | HU-14 | Mismo evento y periodo procesado dos veces | No envía correos repetidos. |

| CP-14.6 | HU-14 | Falla del servidor de correo | Registra el estado de error, informa el fallo y queda en el historial. |

| CP-15.1 | HU-15 | Abrir el panel como Administrador | Muestra totales de equipos, activos e inactivos, calibraciones y certificados. |

| CP-15.2 | HU-15 | Filtrar por rango de fechas | Los indicadores se recalculan al rango. |

| CP-15.3 | HU-15 | Consultar estadísticas por tipo de equipo | Muestra las cifras del tipo seleccionado. |

| CP-15.4 | HU-15 | Registrar una calibración nueva | El indicador correspondiente se actualiza. |

| CP-15.5 | HU-15 | Acceso sin permiso | Rechaza y no muestra datos. |



| ID | HU | Caso de prueba | Resultado esperado |

| --- | --- | --- | --- |

| CP-16.1 | HU-16 | Configurar una conexión externa como Administrador | La conexión queda guardada. |

| CP-16.2 | HU-16 | Intercambiar datos por API REST con formato válido | Se procesan y se registra la solicitud y la respuesta. |

| CP-16.3 | HU-16 | Datos con estructura inválida | Rechaza e informa el error. |

| CP-16.4 | HU-16 | Solicitud sin autenticación o sin autorización | Responde 401 o 403 y no intercambia datos. |

| CP-16.5 | HU-16 | Sincronizar un registro que ya existe | No genera un duplicado. |

| CP-16.6 | HU-16 | Falla de comunicación | Informa el error y queda en el historial de sincronizaciones. |


