# Informe QA en Chrome (Agente C) - WeightControl

Fecha: 2026-10-24. Backend :3000 y frontend :5173 (dev). BD en la nube de `backend/.env`. No se modifico codigo ni se hizo commit.
Evidencia en `docs/qa/evidencia-chrome/` (capturas, PDFs, GIF, JSON de axe/Lighthouse y los scripts `*.mjs` usados para las pruebas por API).

## 1. Resumen ejecutivo

- Pasa: HU-01, HU-02 (con matices de a11y), HU-03, HU-04, casi todo HU-05, S1, S2, S3, U1, U2, C1, C3 (30/15/5 y deduplicacion) y los 215 tests de vitest.
- Fallos graves: (F1) fuga de datos publica en `GET /api/instrumentos`; (F2) un certificado "No Conforme" se muestra publicamente como "CONFORME Y VIGENTE" y el escaneo de alertas revierte el estado "Vencido"; (F3) `GET /api/audit` responde siempre 400.
- U3 no se cumple del todo: `registro` conserva 2 violaciones axe (contraste y heading-order) y la consulta publica con un dato real baja a 96 en Lighthouse.
- Limites de la sesion: se corto por limite de uso; la calibracion se probo por API (la UI de calibracion no se recorrio), el recorrido por teclado fue parcial y solo se recorrieron vistas con TECNICO y ADMIN.

## 2. Tabla de resultados

| ID | Criterio | Resultado | Evidencia |
|---|---|---|---|
| HU-01 | Registro completo con 3 fotos (UI, TECNICO), confirmacion, fecha automatica, consulta por serie | PASA | `hu01-registro-confirmacion.jpg` (modal "Instrumento Radicado", fecha 24/10/2026 6:38:52 p.m.); API: `createdAt` 2026-10-24T23:38:52Z, 3 fotos base64, n=3000; `GET /instrumentos/serial/QA-BASC-001` 200 |
| HU-01 | Campos obligatorios vacios bloquean | PASA | UI: boton de envio `disabled` con campos vacios; API `{}` -> 400 con mensajes por campo |
| HU-02 | Serial duplicado | PASA | UI: "Conflicto de Duplicidad..." antes de enviar, `aria-invalid=true` (~1.5 s); API 409 "Ya existe un instrumento registrado con el serial 'QA-BASC-001'" |
| HU-02 | Precinto duplicado | PASA | UI: mensaje "Precinto Duplicado" y no se emite POST (`u2-precinto-duplicado-ui.jpg`); API 409 |
| HU-02 | Cap. min >= max | PASA | API 400 con `fieldErrors[{campo:'capacidadMinima'}]`; UI `aria-invalid=true` en el campo min |
| HU-02 | Division de escala invalida (bascula, pesa, dinamometro) | PASA | API 400 `campo:divisionEscala` en los tres tipos (n=300 Clase III; d>nominal pesa; n=10 dinamometro); UI `aria-invalid` en el campo e |
| HU-02 | Error junto al campo correcto (aria) | PARCIAL | `aria-invalid` correcto, pero `aria-describedby` es null en serial, min, e y precinto: el mensaje no esta vinculado programaticamente al campo |
| HU-02 | Grafica rango/promedio/% | PASA | Max 150, Min 1: rango 149, promedio 75.5, % 99.33 = (149/150)*100; coincide con calculo manual (`hu02-grafica-y-error-division.jpg`). Menor: con e rechazada sigue el badge "FORMULAS VALIDAS" |
| HU-02 | Registro invalido no se almacena | PASA | Listado API: 0 serials `QA-INV-*` |
| HU-03 | Crear/editar/inactivar usuario, 6 roles | PASA | POST /usuarios 201 para los 6 roles; PUT cambia nombre y rol; duplicado 409; rol invalido 400; vista admin lista los usuarios (`hu03-usuarios-admin.jpg`) |
| HU-03 | Rol sin permiso -> 403 | PASA | AUDITOR POST /instrumentos 403; AUDITOR corregir 403; TECNICO GET/POST /usuarios 403; AUDITOR /alertas/scan 403 |
| HU-03 | Inactivo no inicia sesion ni opera | PASA (nota) | Login inactivo 401 "El usuario se encuentra inactivo"; token previo: `/auth/profile` 401 y `POST /calibraciones` 401. Nota: endpoints `@Public` (listado) siguen respondiendo 200 con ese token (no requieren sesion) |
| HU-04 | Equipo inexistente, datos incompletos | PASA | 404 "Instrumento ... no encontrado"; sin patrones 400; body vacio 400 |
| HU-04 | PDF con ID unico y QR; historial | PASA | `QA-CERT-001B-reemplazo.pdf`; QR decodificado del PDF: `?cert=QA-CERT-001B&serial=QA-BASC-001&sig=...`; `GET /calibraciones/instrumento/:id` lista el certificado |
| HU-04 | Editar/eliminar certificado sellado | PASA | PUT, PATCH y DELETE (ADMIN) -> 403 "sellado e inmutable" |
| HU-04 | Correccion `POST /calibraciones/:id/corregir` | PASA | sin motivo 400; AUDITOR 403; TECNICO 201 emite QA-CERT-001B; original `anulado=true` con motivo y `certificadoReemplazadoPor`; segunda correccion 409 |
| HU-04 | Original se ve ANULADO | PASA | PDF con marca de agua ANULADO y "ESTADO: ANULADO (NO VIGENTE)" (`hu04-pdf-anulado.jpg`); consulta publica en rojo (`hu05-qr-anulado.jpg`). Menor: el PDF anulado dice aun "DICTAMEN: CONFORME (APTO...)" y el chip de la UI dice "VIGENTE" en rojo |
| HU-05 | Consulta publica sin sesion por serial y por QR | PASA | QR valido -> "ESTADO: INSTRUMENTO CONFORME Y VIGENTE", sin propietario ni cliente en `PublicVerificationDto` (15 campos, sin `propietario`/`creadoPor`) |
| HU-05 | sig alterada / cert de otro serial / serial inexistente | PASA | API 404 "certificado no verificable" en los tres y sin `sig`; UI banner rojo "Certificado no verificable" (`hu05-qr-alterado-no-verificable.jpg`) |
| HU-05 | Anulado se muestra anulado | PASA | UI "CERTIFICADO ANULADO / NO VIGENTE ... reemplazado por QA-CERT-001B"; API `esVigente:false`, `certificadoAnulado:true` |
| HU-05 | Fugas sin token | FALLA | Ver seccion 4 (F1) |
| HU-05 | Fechas en la consulta publica | FALLA menor | Fecha de calibracion 2026-10-24T00:00Z se muestra 23/10/2026 (desfase de zona horaria UTC-5) |
| U1 | Verificacion por QR <= 30 s y <= 3 interacciones | PASA | Carga + render medidos en iframe: 320 ms (valido); 1 interaccion (abrir la URL del QR); medido sobre dev server local |
| U2 | 100 % duplicados detectados antes de enviar | PASA | Serial (1.5 s) y precinto detectados en UI con mensaje, sin POST; 2 de 2 casos |
| U3 | axe/Lighthouse (re-ejecucion de scripts) | PARCIAL | axe: login 0, consulta publica 0, registro 2 (`color-contrast` 7 nodos, `heading-order` h4), Lighthouse registro 0.95; coincide con `axe-despues.json`, o sea no esta corregido. Lighthouse real en `/`: a11y 100, best-practices 100, perf 54. En consulta publica con dato real: a11y 96 (`color-contrast` 4.25 y 3.76; `svg-img-alt` en el QR). Los scripts de B usan API simulada y no ven esos casos |
| U3 | Teclado en los 3 formularios | PARCIAL | Consulta publica: 9 Tab hasta el campo, sin trampas, el foco cicla. Login y registro: solo se comprobo que los campos son nativos y alcanzables; no se completo el recorrido solo con teclado |
| S1 | 403 + entrada de auditoria por intento | PASA | 5 intentos fuera de rol -> 5x 403; eventos AUTH_FAILURE 16 -> 21 (+5); descripcion "Acceso denegado (HTTP 403): Usuario [..] con rol [..]" |
| S2 | 6 logins fallidos/min: 5x401, 6o 429, 429 auditado | PASA | 401,401,401,401,401,429; AUTH_FAILURE 22 -> 28 (+5 por email inexistente, +1 "Solicitud bloqueada (HTTP 429) ... Limite 5 por 60 s"). Nota: el limite cuenta tambien los logins exitosos |
| S3 | Serial falso -> 404 solo campos publicos | PASA | 404 `{"message":"certificado no verificable"}` en `/serial/` y `/public/verificar/`; UI banner "no verificable" |
| C1 | NTC 2031 rechazado con desglose | PASA | 18 casos (clases I-IIII x kg/g/lb/t): 16 coincidian con lo esperado; los otros 2 (Clase II n=100 y Clase IIII n=300) estan dentro del rango y fueron aceptados correctamente (error de mi expectativa). Cada rechazo trae `fieldErrors` con `campo` y n calculado |
| C2 | Conforme -> certificado valido | PASA | QA-CERT-001 emitido, instrumento Vigente |
| C2 | No conforme -> certificado anulado e instrumento vencido | FALLA | Ver F2: el instrumento queda "Vencido" al emitir pero el certificado no se marca `anulado` (solo el espejo) y la consulta publica lo da como conforme y vigente |
| C3 | Alertas 30/15/5 sin repetir en 24 h | PASA parcial | Instrumentos a +30, +15, +5, +16, +31 dias: scan genero PREVENTIVA(30), MODERADA(15), CRITICA(5), PREVENTIVA(16) y ninguna a +31; segundo scan inmediato: 0 generadas. La reaparicion tras 24 h no se pudo probar (sin manipular reloj/fechas ajenas; la cubren los tests) |
| M1/M2/M3 | Tests automaticos | PASA | `npx vitest run`: 25 archivos, 215 tests, 0 fallos |
| M-PDF | PDF se ve correcto | PASA | QR presente y decodificable, marca ANULADO en el reemplazado, no imprime el nombre del tecnico ("Firma electronica registrada") |
| GENERAL | Consola y red | PASA parcial | TECNICO y ADMIN: 0 mensajes error/warn, 0 requests con 4xx/5xx en las vistas visitadas (dashboard, instrumentos, actas, administracion/usuarios, consulta publica). No se recorrieron con AUDITOR/ONAC ni la pestana de trazabilidad forense |

## 3. Fallos (severidad, reproduccion, causa probable)

**F1 - ALTA - Fuga publica de datos en `GET /api/instrumentos`.**
Repro: `curl "http://localhost:3000/api/instrumentos?limit=100"` sin token. Devuelve 200 con todos los instrumentos incluyendo `propietario` (razon social, NIT, direccion, ciudad), `creadoPor` y `actualizadoPor` (nombre, correo y rol del tecnico), `evidenciasFotograficas` y `ubicacionFisica`. Causa probable: el controlador marca `@Get()` con `@Public()` y devuelve el DTO completo; solo `:id`, `serial/:serial` y `public/*` se limitaron a `PublicVerificationDto`. Si el frontend lo necesita para la matriz, debe pedirse con token. Tambien son publicos `instrumentos/stats/summary` y `alertas/stats/summary` (solo agregados, riesgo bajo). `GET /calibraciones` y `/calibraciones/:id` sin token dan 401 (correcto). `GET /calibraciones/:id/pdf` es publico por diseno (no imprime tecnico).

**F2 - ALTA - Calibracion No Conforme.**
Repro: crear instrumento QA-BASC-NC, `POST /calibraciones` con `resultado:"No Conforme"` (QA-CERT-NC). Resultado: (a) `calibracion.anulado` queda `false` y `ultimoCertificado` publico no marca anulado; la consulta publica de QA-BASC-NC muestra "ESTADO: INSTRUMENTO CONFORME Y VIGENTE" y el mensaje "verificado y conforme", porque `esVigente` se calcula solo con fechas (`instrumentos.service.ts` ~L661); (b) el estado "Vencido" asignado al emitir se revierte a "Vigente" tras `POST /alertas/scan` porque `alertas.service.ts` L94-96 recalcula `inst.estado` solo por fecha. La diapositiva C2 promete "certificado anulado e instrumento vencido". Solo el documento espejo `Certificado` queda ANULADO.

**F3 - ALTA - `GET /api/audit` siempre 400.**
Repro: con token AUDITOR/ADMIN, `GET /api/audit` (incluso sin parametros) -> 400 "property limit should not exist..." (lista todas las propiedades). Causa probable: `QueryAuditDto` (audit.service.ts) no tiene decoradores class-validator; con `whitelist + forbidNonWhitelisted` el ValidationPipe rechaza. `GET /audit/security-events` si funciona (se uso para S1/S2). El servicio de frontend `audit.service.ts` llama a `/audit`, por lo que la vista de auditoria no puede listar eventos (no se pudo verificar en UI porque el recorrido se corto).

**F4 - MEDIA - U3 incompleto.** Registro: `color-contrast` (7 nodos, `.microlabel-sm` #788596 sobre #f1f5f9 = 3.42; `.microlabel` #0284c7 = 4.09) y `heading-order` (h4). Consulta publica con dato real: contraste 4.25 (#008a2e) y 3.76 (blanco sobre rgb(5,150,105)) y `svg-img-alt` (QR `role=img` sin nombre). Los scripts de B interceptan la API y solo auditan la consulta con 404, por eso reportan 100.

**F5 - MEDIA - HU-02 a11y.** `aria-describedby` ausente en campos con error (el plan lo pedia).

**F6 - BAJA.** Fechas publicas con desfase de un dia (UTC vs local); chip "VIGENTE" rojo en certificado anulado; PDF anulado conserva "DICTAMEN: CONFORME"; en la UI el badge "FORMULAS VALIDAS" aparece con division rechazada; el rate limit de login cuenta tambien los exitosos (5 por minuto por IP: tras 5 logins el sexto, aunque correcto, da 429); la fase 3 del registro viene precargada con precinto/fechas de ejemplo (2025-05-14 / 2026-05-14) y el boton no esta deshabilitado con precinto duplicado, aunque bloquea el envio.

## 4. Hallazgos de fuga de datos (sin token)

| Endpoint | Resultado |
|---|---|
| `GET /instrumentos` | 200, FUGA: propietario (nombreRazonSocial, nitRut, direccion, ciudad, departamento), creadoPor/actualizadoPor (nombre, email, rol), evidencias, ubicacion |
| `GET /instrumentos/:id`, `/serial/:serial`, `/public/verificar/:serial` | 200, solo 15 campos publicos (serial, marca, modelo, tipo, clase, capacidades, unidad, division, estadoMetrologico, esVigente, fechas, precinto SIMEL, mensaje, ultimoCertificado) sin propietario ni tecnico |
| `GET /instrumentos/public/search` | 404 sin criterio valido |
| `GET /calibraciones`, `/calibraciones/:id`, `/calibraciones/instrumento/:id` | 401 |
| `GET /alertas`, `/usuarios`, `/audit` | 401 |
| `GET /calibraciones/:id/pdf` | 200 publico (sin nombre de tecnico) |
| `GET /instrumentos/stats/summary`, `/alertas/stats/summary` | 200 agregados |

El PDF y el DTO publico incluyen el precinto SIMEL (dato esperado en la consulta publica).

## 5. Datos QA- creados y limpieza

No se borro nada (los certificados sellados no se pueden eliminar y la regla de seguridad impide borrado permanente); lo siguiente queda en la BD:

- Usuarios (todos INACTIVOS tras la limpieza): qa-admin, qa-ciudadano, qa-sic, qa-institucion-acreditacion, qa-auditor, qa-tecnico, todos `@example.com`.
- Instrumentos: QA-BASC-001, QA-BASC-NC, QA-UI-001, QA-C1-4, QA-C1-6, QA-C1-13, QA-C1-17, QA-C1-18, QA-C3-D30, QA-C3-D15, QA-C3-D5, QA-C3-D16, QA-C3-D31. Sus precintos son QA-SIMEL-* / QA-C1-P* / QA-C3-P-*.
- Certificados (sellados): QA-CERT-001 (ANULADO), QA-CERT-001B (reemplazo, vigente), QA-CERT-NC (No Conforme) y sus espejos en `certificados`.
- Alertas: las generadas por los escaneos para QA-C3-* (4) y, como efecto colateral del escaneo manual, 6 alertas VENCIDA nuevas sobre instrumentos del seed (DISP-2025-33412-CAL, CAM-2024-11840-MED, BAS-2024-77150-BAQ, BAL-2026-10294-PER, BAL-2026-80905-BOG, BAL-2026-40433-BOG). Tambien el escaneo cambio `estado` de QA-BASC-NC (propio).
- Auditoria: eventos AUTH_FAILURE de las pruebas S1/S2 (incluye `qa-noexiste@example.com`) y los 429 de mis rafagas de login iniciales.
- Para limpiar: `DELETE /api/instrumentos/:id` (ADMIN) para los QA- instrumentos y `DELETE /api/usuarios/:id` para los qa-*; las alertas y certificados requieren borrado directo en Mongo por el usuario.

## 6. Lo que NO se pudo probar y por que

- Calibracion desde la UI (solo por API) y el flujo de correccion desde la UI.
- Recorrido de todas las vistas con AUDITOR/ONAC y la pestana "Trazabilidad forense" / "Alertas" con cada rol; consola y red solo con TECNICO y ADMIN.
- Teclado completo en login y registro (parcial).
- Reaparicion de alertas pasadas 24 h (requiere reloj o datos ajenos; cubierto por tests).
- Lighthouse de login/consulta/registro en modo "flow" autenticado; se uso el CLI sobre `/` y la consulta publica y el script de B para registro.
- GIF: grabado (29 frames) con login, registro, consulta publica y vistas, pero no incluye la calibracion (hecha por API) y la interrupcion por limite de uso cortó el recorrido de la vista de auditoria.
- Medidas de tiempo en dev server local sin red real; U1 mide carga, no el tiempo humano de escanear.
- La herramienta `find` falló por un limite de uso del modelo; se uso `read_page` y JavaScript.

---

# Ronda 2 (tras FIX-BACK y FIX-FRONT)

Fecha: 2026-10-24/25. Se reinicio el backend (`npm run start:dev`, proceso viejo detenido) y responde en :3000; el frontend :5173 responde 200. Estado del repo: HEAD `4fc780c` con 78 rutas modificadas o nuevas sin commit. No se modifico codigo ni se hizo commit. Datos nuevos con prefijo `QA-R2-`. Evidencia en `docs/qa/evidencia-chrome/` (archivos `r2-*`, `axe-real-ronda2.json`, `teclado-ronda2.txt`, `qa-ronda2-calibracion-qr-verificacion-publica.gif`, scripts `r2*.mjs`).

## R2.1 Re-verificacion de los fallos de la ronda 1

| ID | Criterio | Ronda 1 | Ronda 2 | Evidencia |
|---|---|---|---|---|
| F1 | `GET /api/instrumentos` sin token no trae propietario, creadoPor, evidencias ni ubicacion; con TECNICO si | FALLA | PASA | Sin token las claves son id, serial, marca, modelo, tipo, clase, capacidades, unidad, division, n, precinto, fechas, estado, createdAt, updatedAt. Con TECNICO ademas propietario (dato QA), evidenciasFotograficas, ubicacionFisica, creadoPor, actualizadoPor. `/:id` sin token: 15 campos publicos. La consulta publica sin sesion carga (`r2-u1-qr-publico-valido.jpg`) |
| F2/C2 | No Conforme => certificado anulado, instrumento Vencido, consulta publica NO CONFORME | FALLA | PASA | QA-R2-CERT-NC: `anulado=true`, motivo "Resultado No Conforme", instrumento Vencido; API publica `esVigente=false` con mensaje "Instrumento NO CONFORME... certificado anulado". UI: banner rojo "ESTADO: INSTRUMENTO NO CONFORME / NO VIGENTE" y chip con texto "NO CONFORME" (`r2-c2-publico-no-conforme.jpg`) |
| F2/C2 | El escaneo de alertas no lo revierte | FALLA | PASA | Tras `POST /alertas/scan` QA-R2-NC sigue Vencido y se genera alerta VENCIDA "declarado NO CONFORME... permanece VENCIDO" |
| F2/C2 | Una calibracion Conforme posterior lo restablece | no probado | PASA | QA-R2-CERT-NC-OK: instrumento Vigente y consulta publica Vigente (`esVigente=true`) |
| F3 | `GET /api/audit` 200 sin parametros y con filtros | FALLA | PASA | AUDITOR `/audit` 200; ADMIN `?limit=5&actionType=AUTH_FAILURE` 200 con 5 items; `?entityAffected=Calibracion&page=1&limit=3` 200; TECNICO 403 |
| F3 | Pantalla de trazabilidad carga en la UI | no probado | PARCIAL | ADMIN: la pestana "Trazabilidad Forense y Eventos 403" carga 50 filas desde `/api/audit?limit=50` (200) (`r2-f3-trazabilidad-admin.jpg`). AUDITOR: la UI no ofrece esa pantalla (el boton "Administracion del Sistema" lo lleva a la consulta publica); solo la ve por API |
| F4 | Registro con 0 violaciones axe y Lighthouse a11y 100 | FALLA | PASA | `axe-real-run.mjs`: 16 vistas (login, consulta 404, consulta con dato real, y TECNICO y ADMIN en registro, instrumentos, actas, usuarios, trazabilidad, parametros) con axe 0 y Lighthouse a11y 100 en todas. La consulta con dato real pasa de 96 a 100 |
| F5 | `aria-describedby` en campos con error (HU-02) | FALLA | PASA | UI: serial duplicado, min>=max y division invalida tienen `aria-invalid=true` y `aria-describedby` apunta a un elemento con el texto ("Rechazo Metrologico NTC 2031: Clase III exige 500 <= n <= 10.000. Actual: n = 300") |
| F6a | PDF anulado ya no dice CONFORME | FALLA | PASA con defecto visual | `r2-f6-pdf-anulado.png`: "ESTADO: ANULADO (NO VIGENTE)" y dictamen "CERTIFICADO ANULADO (SIN VALIDEZ; RESULTADO ORIGINAL: CONFORME)". Defecto: ese texto se solapa con "Reglamentacion NTC 2031 / OIML R 76-1" |
| F6b | Chip de anulado no dice VIGENTE | FALLA | PASA | UI publica: chip rojo "ANULADO" (`r2-hu05-publico-anulado.jpg`) |
| F6c | Fechas publicas sin desfase | FALLA | PASA | Calibracion del 2026-10-24: la UI muestra "ULTIMA CALIBRACION 24/10/2026" y "PROXIMA 24/10/2027" |
| F6d | El limite de login cuenta solo fallidos | FALLA | PASA | Usuario `qa-r2-tecnico`: 3 logins correctos (200 x3), luego 401 x5 y el sexto fallido 429; AUTH_FAILURE 32 a 38 (+5 contrasena incorrecta, +1 "Solicitud bloqueada (HTTP 429)... Limite 5 por 60 s") |

## R2.2 Pruebas pendientes de la ronda 1

| Prueba | Resultado ronda 2 | Evidencia |
|---|---|---|
| Calibracion desde la UI (TECNICO, Actas y Ensayos, "Registrar calibracion y emitir certificado") | PASA | Con numero de certificado vacio "Emitir y sellar" queda deshabilitado; al quitar el unico patron aparece "Debe declarar al menos 1 patron..." y sigue bloqueado (`r2-hu04-modal-calibracion-incompleta.jpg`); con datos completos se emite "QA-R2-UI-CERT-1 emitido y sellado inmutablemente" sin requests fallidos |
| Ver el PDF con QR desde la UI | PASA | El boton VER abre un visor con el certificado, QR y panel lateral con QR (`r2-hu04-visor-pdf-ui.jpg`); QR decodificado del PDF: `?cert=QA-R2-UI-CERT-1&serial=QA-R2-UI&sig=...` |
| Recorrido de vistas con ADMIN, AUDITOR, ONAC y TECNICO | PASA | Se recorrieron todas las pestanas del encabezado y las subpestanas (matriz y cartografia; usuarios, trazabilidad y parametros en ADMIN). Un interceptor de `fetch` y `console.error` instalado en la pagina registro 0 respuestas no-OK y 0 errores para AUDITOR, ONAC y TECNICO; para ADMIN la lista de red mostro solo 200/204 y la consola 0 mensajes error/warn |
| Teclado en login, registro y consulta publica | PASA | `teclado-run.mjs`: login 8 paradas, registro 26, consulta 11, sin trampas ni foco sin indicador; el modal del escaner QR atrapa el foco, Esc lo cierra y devuelve el foco. A mano en Chrome: Tab x6 y Enter abre el login, Tab llega a perfil, correo y contrasena, se escribe y Enter inicia sesion (ROL TECNICO) |
| Reaparicion de alertas pasadas 24 h | PARCIAL (no en vivo) | No se puede avanzar el reloj sin tocar datos ajenos. En vivo: QA-R2-D5 genero MODERADA y el segundo escaneo genero 0. En codigo: `alertas.service.ts` busca alerta con `createdAt >= ahora - 24 h`; el test C3 de `backend/test/escenarios-calidad.spec.ts` (L446-453) comprueba la ventana de 24 h |
| Flujo de correccion y su vista publica | PASA | `POST /calibraciones/:id/corregir` emite QA-R2-CERT-OK-B; el original queda anulado con `certificadoReemplazadoPor`; la UI publica del original muestra "CERTIFICADO ANULADO / NO VIGENTE ... reemplazado por QA-R2-CERT-OK-B" |
| U1 en UI real | PASA | Sin sesion (`localStorage` sin `wc_*`), URL del QR firmado abierta: 1 interaccion; DOMContentLoaded 257 ms, load 338 ms, respuestas de la API a los 543 y 731 ms desde el inicio de la navegacion, con el dictamen "CONFORME Y VIGENTE" visible y sin propietario ni cliente |
| GIF | PARCIAL | `qa-ronda2-calibracion-qr-verificacion-publica.gif` (18 frames): vistas por rol, modal de calibracion, visor PDF y verificacion publica. El instrumento QA-R2-UI se creo por API en esta ronda; el registro por UI esta en el GIF de la ronda 1 |

## R2.3 Veredicto por historia y escenario (ronda 2)

| ID | Veredicto | Evidencia observada |
|---|---|---|
| HU-01 | PASA | Ronda 1 (UI con 3 fotos, confirmacion y fecha automatica); ronda 2: propietario visible solo con token de TECNICO |
| HU-02 | PASA | API: serial y precinto duplicados 409; min>=max 400 `capacidadMinima`; division invalida 400 `divisionEscala` en bascula, pesa y dinamometro; UI con `aria-invalid` y `aria-describedby` |
| HU-03 | PASA | `qa-r2-tecnico`: crear, editar (el rol AUDITOR se ve de inmediato en `/auth/profile`), inactivar; token previo 401 en profile y en POST /calibraciones; login 401; AUDITOR y TECNICO fuera de rol 403 |
| HU-04 | PASA | Emision por UI y API, datos incompletos bloquean, PDF con ID y QR, PUT y DELETE 403, correccion con original ANULADO. Defectos menores en R2.4 |
| HU-05 | PASA | Consulta por serial y por QR firmado sin sesion; sig alterada 404, cert de otro serial 404, serial falso 404; anulado y no conforme se ven como no vigentes; sin propietario; sin fuga en el listado |
| U1 | PASA | 1 interaccion, datos a 0,73 s en dev local |
| U2 | PASA | Ronda 1 (UI, serial y precinto antes de enviar) y ronda 2 (409 por API para ambos) |
| U3 | PASA | axe 0 y Lighthouse a11y 100 en 16 vistas; teclado sin trampas |
| S1 | PASA | 4 intentos fuera de rol: 403 x4 y AUTH_FAILURE 39 a 43 |
| S2 | PASA | 5x401 y 429 auditado; los logins correctos ya no consumen el limite |
| S3 | PASA | Serial falso 404 "certificado no verificable", sin datos |
| C1 | PASA | Clase I (g), Clase II (lb, exceso) y Clase IIII (t) rechazados con `fieldErrors` y n calculado |
| C2 | PASA | Ver R2.1 |
| C3 | PARCIAL | 30/15/5 y deduplicacion vistos en vivo; la ventana de 24 h solo en codigo y test |
| M1, M2, M3 | PASA | `npx vitest run`: 28 archivos, 239 tests, 0 fallos |

## R2.4 Fallos restantes

1. **BAJA - La lista de Actas y Ensayos muestra APROBADA para un certificado anulado.** Repro: TECNICO, Actas y Ensayos; la fila `QA-CERT-001` (anulado por correccion en la ronda 1) aparece "APROBADA" (los No Conformes salen "OBSERVADA"). Causa probable: el estado de la fila sale solo de `resultado`, no de `anulado`.
2. **BAJA - Filas "Equipo null"** en esa lista para certificados cuyo instrumento fue borrado (datos QA de la ronda 1). Causa probable: la lista no tolera `instrumento` nulo.
3. **BAJA - Solape de texto en el PDF anulado** (dictamen "CERTIFICADO ANULADO..." sobre "Reglamentacion NTC 2031 / OIML R 76-1").
4. **BAJA - AUDITOR sin pantalla de trazabilidad en la UI**, aunque `/api/audit` le responde 200 (la pestana de administracion lo lleva a la consulta publica). Si es intencional, conviene dejarlo escrito en las HU y diapositivas.
5. **INFO - Umbral de alertas con `ceil`:** un instrumento que vence en 5 dias y 10 horas se alerta como MODERADA (6 dias), no CRITICA. Es coherente con el codigo; conviene documentarlo en la medida de C3.
6. **INFO - Alertas VENCIDA por No Conforme** reutilizan el nivel VENCIDA (la alerta no lleva dias restantes utiles).

## R2.5 Datos QA- nuevos y limpieza

No hice borrado permanente: `DELETE /api/instrumentos/:id` elimina el registro de forma definitiva y la politica de seguridad de esta sesion lo prohibe aunque se pida, asi que quedan para que el usuario los elimine como ADMIN.

- Instrumentos QA- en la BD ahora (verificados por listado como ADMIN): QA-R2-OK, QA-R2-NC, QA-R2-NC2, QA-R2-UI, QA-R2-D5.
- Certificados sellados (no se pueden borrar): de la ronda 2 `QA-R2-CERT-OK` (anulado), `QA-R2-CERT-OK-B`, `QA-R2-CERT-NC` (anulado), `QA-R2-CERT-NC-OK`, `QA-R2-CERT-NC2` (anulado), `QA-R2-UI-CERT-1`; de la ronda 1 siguen `QA-CERT-001` (anulado), `QA-CERT-001B` y `QA-CERT-NC` (su instrumento ya no existe).
- Usuarios (todos INACTIVOS): los 6 `qa-*@example.com` de la ronda 1 y `qa-r2-tecnico@example.com`.
- Alertas: 3 nuevas de QA-R2 (VENCIDA x2 por no conforme y MODERADA de QA-R2-D5) y las de rondas previas.
- Auditoria: eventos CREATE, CALIBRATE, ANNUL, AUTH_FAILURE y VERIFICATION_FAILURE de todas las pruebas, incluidos `qa-noexiste@example.com` y los 429.
- Procesos que quedan levantados: backend :3000, frontend :5173 y un segundo Vite en :5199 (de la ronda 1).

## R2.6 Resumen

Los fallos F1 a F6 de la ronda 1 quedaron corregidos, salvo detalles menores. Las 5 HU y 11 de los 12 escenarios pasan con evidencia observada; C3 queda PARCIAL porque la reaparicion tras 24 h solo se comprobo en codigo y test. Fallos restantes: 4 de baja severidad y 2 informativos (R2.4).


---

# Ronda 3 (últimas comprobaciones)

Fecha: 2026-10-24 (21:00-21:10 UTC-5). Backend reiniciado (`npm run start:dev`, responde en :3000); frontend :5173 respondiendo. No se modificó código ni se hizo commit. No se borró nada permanente. Evidencia en `docs/qa/evidencia-chrome/r3-*` (capturas, PDF `r3-ui.pdf`, `axe-real-build-ronda3.json`).

## R3.1 Tabla de ítems

| Ítem | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 1 | Backend reiniciado con la última corrección; frontend en 5173 | PASA | Proceso anterior detenido y reiniciado; `/api/instrumentos/serial/QA-X` responde 404 (servicio arriba); 5173 responde 200; 4fc780c HEAD, 79 rutas sin commit |
| 2 | Actas (ADMIN): certificado anulado muestra ANULADA, nunca APROBADA | PASA | `r3-2-actas-anulada-y-equipo-eliminado.jpg`: QA-CERT-001 (anulado) "ANULADA"; QA-R2-CERT-OK (anulado) "ANULADA"; QA-R2-CERT-NC y QA-R2-CERT-NC2 (anulados) "ANULADA". Matiz: QA-CERT-NC muestra OBSERVADA porque el certificado se creó antes del fix y tiene `anulado=false` en BD (no se corrigió datos antiguos) |
| 2 | Certificado de instrumento borrado: "Equipo eliminado (certificado conservado por trazabilidad)" | PASA | Misma captura: QA-CERT-001, QA-CERT-001B, QA-CERT-NC muestran ese texto en lugar de "Equipo null" |
| 3 | AUDITOR abre "Trazabilidad y Auditoría" en solo lectura, sin pestañas Usuarios ni Parámetros, sin /usuarios en red | PARCIAL | Botón "TRAZABILIDAD Y AUDITORÍA" abre la vista; pestañas: solo "2. Trazabilidad Forense y Eventos 403" y "ACTUALIZAR BITÁCORA"; 50 filas; red: solo `GET /api/audit?limit=50`, sin /usuarios (`r3-3-auditor-trazabilidad-solo-lectura.jpg`). Defecto: el encabezado sigue diciendo "Administración del Sistema, Usuarios y Seguridad" y "Gestión completa del ciclo de vida de usuarios" |
| 3 | SIC: igual que AUDITOR | PARCIAL | Mismo resultado: solo pestaña de trazabilidad, 50 filas, sin /usuarios; mismo texto de encabezado (`r3-3-sic-trazabilidad-solo-lectura.jpg`) |
| 3 | TECNICO bloqueado (403 en API) | PASA | Botón visible en el encabezado; al pulsarlo aparece "Acceso Denegado (403): La Consola de Administración/Trazabilidad requiere rol ADMINISTRADOR, AUDITOR o SIC" (`r3-3-tecnico-403.jpg`). API: `GET /audit` con TECNICO 403, `GET /usuarios` con AUDITOR 403 y con SIC 403 |
| 4 | Alerta VENCIDA por No Conforme: sin días restantes en la UI y mensaje claro | PARCIAL (no verificable en UI) | La aplicación no tiene vista de lista de alertas ni botón de escaneo: solo contadores KPI (`KpiRow.tsx`). Por API: QA-R2-NC y QA-R2-NC2 con nivel VENCIDA, mensaje "fue declarado NO CONFORME en su última calibración y permanece VENCIDO hasta una calibración conforme" (claro), pero `diasRestantes: 341` sigue en el payload. Escaneo: `POST /alertas/scan` 200 y 0 nuevas (ya generadas en 24 h) |
| 5a | Calibración en UI con datos incompletos: bloquea emisión con mensaje por campo | FALLA (parcial) | Bloquea: con número de certificado vacío, fecha vacía o próxima vacía el botón "Emitir y sellar" queda deshabilitado. NO hay mensaje por campo: `aria-invalid` ausente y sin texto junto al campo. El único aviso es "Calibración incompleta (se requiere al menos 1 patrón y 1 punto de ensayo)", que es engañoso porque patrón y puntos estaban llenos (`r3-5a-calibracion-incompleta-mensaje-generico.jpg`) |
| 5b | Abrir el PDF desde la UI: QR presente y decodifica a la URL firmada | PASA | UI: botón VER de QA-R2-UI-CERT-1 abre el visor con el QR en el PDF y en el panel lateral (`r3-5b-visor-pdf-ui-qr.jpg`). El PDF que sirve la API (`r3-ui.pdf`) decodifica a `http://localhost:5173/?cert=QA-R2-UI-CERT-1&serial=QA-R2-UI&sig=fYWHZfW85gz35HSGkKuarucLtLJLu3bGqmr9FVETZXk`. Defecto menor: en el panel lateral del visor, "SERIAL" muestra el número de certificado (QA-R2-UI-CERT-1), no el serial físico (QA-R2-UI) |
| 6 | C3 a 24 h: si no se puede avanzar el reloj, dilo y deja la prueba por test | PARCIAL | No se avanzó el reloj (no se tocan datos ajenos). Test: `npx vitest run -t "C3"` = 9 pasan (bloque "C3 - Alertas por nivel a 30/15/5 días sin repetir en 24 h" de `escenarios-calidad.spec.ts`, incluido el de ventana de 24 h, L446-453) |
| 7 | Build de producción: axe y Lighthouse a11y | PASA | `npm run build` OK (exit 0, 1061 módulos); `vite preview` en 4173; `axe-real-run.mjs` contra build: 16 vistas con axe 0 violaciones y Lighthouse a11y 100 (login, consulta pública con dato real, registro TECNICO y resto) |
| 8 | vitest backend | PASA | `npx vitest run`: 28 archivos, 240 tests pasan, 0 fallos |

## R3.2 Veredicto final por HU (solo con evidencia observada)

| HU | Veredicto | Motivo |
|---|---|---|
| HU-01 | PASA | Registro completo y consulta por serial (rondas 1 y 2) |
| HU-02 | PASA | Duplicados, min>=max, división inválida en tres tipos, `aria-describedby` (ronda 2) |
| HU-03 | PASA | Crear, editar, inactivar; 403 por rol (AUDITOR, SIC y TECNICO sin /usuarios); inactivo sin acceso (ronda 2) |
| HU-04 | FALLA (parcial) | Bloqueo de emisión sí, pero sin mensaje por campo (5a); el resto (PDF, QR, corrección, inmutabilidad) pasa |
| HU-05 | PASA | Consulta por serial y QR firmado sin sesión; QR del PDF decodifica a la URL firmada (5b) |

## R3.3 Veredicto final por escenario (12)

| Escenario | Veredicto | Motivo |
|---|---|---|
| U1 | PASA | 1 interacción y carga de 0,73 s en dev local (ronda 2) |
| U2 | PASA | Duplicados de serial y precinto antes de enviar (rondas 1 y 2) |
| U3 | PASA | Build de producción: axe 0 y Lighthouse a11y 100 en 16 vistas |
| S1 | PASA | 403 y entradas de AUTH_FAILURE por cada intento (ronda 2) |
| S2 | PASA | 5x401 y 429 auditado (ronda 2) |
| S3 | PASA | Serial falso 404 con solo campos públicos (ronda 2) |
| C1 | PASA | Rechazos NTC 2031 con desglose en clases I-IIII y unidades kg/g/lb/t (ronda 2) |
| C2 | PASA | No conforme: certificado anulado, instrumento Vencido, consulta pública no vigente; el escaneo no lo revierte; conforme posterior lo restablece (ronda 2) |
| C3 | PARCIAL | 30/15/5 días verificados en vivo; ventana de 24 h solo por test (9 tests C3 pasan) |
| M1 | PASA | vitest 240 tests pasan |
| M2 | PASA | vitest 240 tests pasan |
| M3 | PASA | vitest 240 tests pasan; PDF sin nombre del técnico y con marca ANULADO (rondas 1 y 2) |

## R3.4 Pendiente o no verificable

1. **Lista de alertas en la UI (ítem 4):** no existe en la aplicación. Solo hay contadores KPI. Por API la alerta está bien, pero `diasRestantes: 341` sigue llegando en el payload de una alerta por No Conforme. Causa probable: el cálculo de `diasRestantes` en `alertas.service.ts` no distingue el caso NO_CONFORME (solo lo ignora para el nivel). Recomendación: enviar `null` o no enviar el campo para VENCIDA por No Conforme.
2. **C3 a 24 h en vivo:** no se pudo avanzar el reloj sin tocar datos ajenos. Cubierto por el test (`escenarios-calidad.spec.ts`, bloque C3, 9 tests pasan).
3. **Mensaje por campo en calibración (5a):** defecto abierto (ver FALLA).
4. **Encabezado de la vista de trazabilidad para AUDITOR y SIC:** texto "Administración del Sistema, Usuarios y Seguridad" y "Gestión completa del ciclo de vida de usuarios" en una vista de solo lectura. Es copy engañoso, no un fallo de acceso.
5. **QA-CERT-NC (anulado=false, OBSERVADA):** creado en ronda 1, antes del fix de anulación automática. No se modificó porque el certificado está sellado. Matiz de datos antiguos.
6. **Visor del PDF:** la barra lateral muestra el número de certificado como "SERIAL" (defecto menor).

## R3.5 Datos QA- y limpieza

- Usuarios: `qa-sic@example.com` se reactivó para la prueba de SIC y se volvió a inactivar (estado final: inactivo). El resto de usuarios `qa-*` siguen inactivos.
- Instrumentos QA- en BD: QA-R2-OK, QA-R2-NC, QA-R2-NC2, QA-R2-UI, QA-R2-D5. No se borró nada (el borrado es permanente y no se permite).
- Certificados sellados: sin cambios en esta ronda (QA-CERT-001, QA-CERT-001B, QA-CERT-NC, QA-R2-CERT-OK, QA-R2-CERT-OK-B, QA-R2-CERT-NC, QA-R2-CERT-NC-OK, QA-R2-CERT-NC2, QA-R2-UI-CERT-1).
- Alertas: quedan las de QA-R2-* y también alertas huérfanas de QA-C3-D5, D15, D16 y D30 (sus instrumentos ya no existen, pero las alertas siguen en la BD). Requiere limpieza directa en Mongo.
- Auditoría: eventos AUTH_LOGIN, AUTH_FAILURE y VERIFICATION_FAILURE de esta ronda.
- Procesos: backend :3000 y frontend :5173 activos; :5199 sigue activo (de rondas anteriores); el servidor de preview de producción (:4173) se detuvo. La carpeta `frontend/dist` se generó con el build (es artefacto, no código fuente).

## R3.6 Resumen corto

- **Funciona:** Actas muestra ANULADA y "Equipo eliminado"; TECNICO recibe 403 en trazabilidad; AUDITOR y SIC ven solo la bitácora en solo lectura y sin /usuarios; el QR del PDF decodifica a la URL firmada; build de producción con axe 0 y Lighthouse 100; vitest 240/240.
- **Falla:** la calibración bloquea la emisión pero sin mensaje por campo (y con un mensaje engañoso); `diasRestantes` sigue en la alerta de No Conforme; el visor muestra el número de certificado como "SERIAL".
- **Parcial o no verificable:** la UI de alertas no existe (no pude verificar lo visual); C3 a 24 h solo por test.


---

# Ronda 4 (comprobaciones tras FIX-3)

Fecha: 2026-10-24 (21:20-21:40 UTC-5). Backend reiniciado con `npm run start:dev` (código nuevo de alertas) y respondiendo en :3000; frontend :5173 respondiendo. No se modificó código ni se hizo commit; no se borró nada permanente. Datos nuevos con prefijo `QA-R4-`. Evidencia en `docs/qa/evidencia-chrome/r4-*`.

Nota de método: `read_page` de la extensión no expone `aria-invalid` ni `aria-describedby` (solo rol, nombre y tipo del campo; comprobado sobre el campo del número de certificado). Los atributos aria se leyeron con `getAttribute` en el DOM de la propia página y se contrastaron con las capturas.

## R4.1 Tabla de ítems

| Ítem | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 1a | Número de certificado vacío + "Emitir y sellar": mensaje junto al campo (`role=alert`, `aria-invalid`, `aria-describedby`), foco en el campo, sin el aviso engañoso | PASA | `aria-invalid="true"`, `aria-describedby` apunta a un `role=alert` con "El número de certificado es obligatorio."; el foco queda en `cal-num-cert`; resumen "Calibración incompleta: corrija 1 campo(s) marcado(s)."; el texto "al menos 1 patrón y 1 punto" no aparece (`r4-1a-cert-vacio-mensaje-campo.jpg`) |
| 1b | Fecha próxima vacía | PASA | Solo `cal-date-prox` marcado: "La fecha de próxima calibración es obligatoria."; foco en ese campo (`r4-1b-fecha-proxima-vacia.jpg`) |
| 1b | Fecha próxima anterior a la de calibración | PASA | Solo `cal-date-prox` marcado: "La fecha de próxima calibración debe ser posterior a la fecha de calibración." (`r4-1b-fecha-proxima-anterior.jpg`) |
| 1b | Sin patrones | PASA | Solo el grupo de patrones: `aria-invalid="true"`, `aria-describedby="cal-patrones-error"`, foco en `cal-patrones`; resumen "se requiere al menos 1 patrón" (`r4-1b-sin-patrones.jpg`). Defecto menor: el aviso aparece dos veces (bloque rojo y línea inferior) |
| 1b | Sin puntos de ensayo | PASA | Solo el grupo de puntos: `aria-invalid="true"`, `aria-describedby="cal-puntos-error"`, foco en `cal-puntos`; resumen "se requiere al menos 1 punto de ensayo" (`r4-1b-sin-puntos.jpg`) |
| 1c | Con todo completo emite normalmente | PASA | `QA-R4-CERT-OK` sobre QA-R2-D5: "¡Certificado de calibración QA-R4-CERT-OK emitido y sellado inmutablemente!"; API confirma el certificado (`r4-1c-emision-ok.jpg`) |
| 1d | Número de certificado duplicado marca el campo del certificado | PASA | Con `QA-R2-UI-CERT-1`: `aria-invalid="true"` en `cal-num-cert`, mensaje "Ya existe una calibración registrada con el número de certificado 'QA-R2-UI-CERT-1'.", foco en el campo (`r4-1d-certificado-duplicado.jpg`) |
| 2 | VENCIDA por No Conforme devuelve `diasRestantes: null` (incluida la antigua de 341) | PASA | `GET /alertas` como ADMIN y TECNICO: QA-R2-NC y QA-R2-NC2 con `diasRestantes: null` (antes 341) |
| 2 | Instrumento QA- No Conforme nuevo + escaneo => null | PASA | QA-R4-NC con QA-R4-CERT-NC (`anulado=true`, instrumento Vencido); `POST /alertas/scan` genera 1 alerta VENCIDA con `diasRestantes: null` |
| 2 | VENCIDA por fecha conserva el valor negativo | PASA | Instrumentos del seed: -164, -146, -143, -110, -92, -89, -85, -15, -5 sin cambios |
| 2 | UI sin "341" ni "null" crudo | PASA | Dashboard de Auditoría (UNIVERSO 15, CONFORMIDAD 46.7 %, POR VENCER 0, MEDIDAS CAUTELARES 8) y bitácora de trazabilidad: búsqueda de `341`, `null`, `undefined` y `NaN` en el texto de la página: 0 coincidencias. La aplicación sigue sin vista de lista de alertas (solo contadores KPI) |
| 3a | AUDITOR: encabezado "Trazabilidad y Auditoría" (solo lectura) | PASA | H1 "Trazabilidad y Auditoría", etiqueta "CONSULTA DE SOLO LECTURA · BITÁCORA INMUTABLE", 50 filas, sin pestañas de Usuarios/Parámetros (`r4-3a-auditor-trazabilidad.jpg`) |
| 3a | SIC: igual | PASA | Mismo encabezado y contenido (`r4-3a-sic-trazabilidad.jpg`) |
| 3a | ADMIN sigue con "Administración del Sistema" | PASA | H1 "Administración del Sistema, Usuarios y Seguridad" con las 3 pestañas (`r4-3a-admin-administracion.jpg`) |
| 3a | Ruta de navegación (breadcrumb) | PARCIAL | AUDITOR y SIC siguen viendo "Consola de Mando Centralizada / Administración del Sistema, Usuarios y RBAC" |
| 3b | Visor PDF en consulta pública: "CERTIFICADO: <número>" y "SERIAL DEL EQUIPO: <serial>" correctos | PASA | Sin sesión: "CERTIFICADO: QA-R2-UI-CERT-1", "SERIAL DEL EQUIPO: QA-R2-UI", marca y precinto (`r4-3b-visor-publico-certificado-y-serial.jpg`) |
| 3b | Visor PDF desde Actas (TECNICO) | PARCIAL | Muestra "CERTIFICADO: QA-R2-UI-CERT-1" (correcto, ya no confunde el número con el serial) pero no muestra "SERIAL DEL EQUIPO" porque `AccreditationView.tsx` no pasa `serial` al visor (`r4-3b-visor-actas-solo-certificado.jpg`) |
| 3b | Visor PDF desde el modal de calibración | NO VERIFICABLE | Tras emitir, `RegisterCalibrationModal` llama a `onSuccess` (L211) y `AccreditationView` cierra el modal, así que el panel de "Certificado emitido" con el visor no llega a mostrarse; el código del visor sí pasa `serial` (L724-735), pero no se pudo observar en pantalla |
| 4 | `npx vitest run` (backend) | PASA | 29 archivos, 247 tests pasan, 0 fallos |
| 5 | `npx tsc --noEmit` (frontend) | PASA | exit 0, sin errores. Backend `tsc --noEmit` también exit 0 |

## R4.2 Defectos nuevos o que siguen abiertos

1. **MEDIA - La lista de Actas y Ensayos solo muestra la primera página (10 de 18) y los certificados nuevos no aparecen.** Repro: TECNICO, Actas y Ensayos, emitir un certificado (`QA-R4-CERT-OK`); el toast confirma la emisión pero la fila no aparece, ni tras cambiar de pestaña y volver. `GET /calibraciones` devuelve `meta.total 18, limit 10, hasNextPage true` y el orden es del más antiguo al más nuevo; la UI no tiene paginación (no hay botones siguiente/anterior). Causa probable: `calibracionesService.getAll()` se llama sin `page`/`limit` y sin orden descendente. Consecuencia: el certificado recién emitido no se puede abrir (VER/PDF) desde la UI.
2. **MEDIA - Al emitir desde Actas el modal se cierra de inmediato y no se ve el certificado emitido.** `RegisterCalibrationModal.tsx` L211 llama `onSuccess()`, y `AccreditationView.tsx` lo usa para cerrar el modal (`setShowCalibrationModal(false)`); el panel "Certificado Emitido e Inmutable" con el botón del visor y descarga queda inalcanzable. Junto con el defecto 1 deja al técnico sin forma de ver el PDF y QR del certificado que acaba de emitir.
3. **BAJA - El visor abierto desde Actas no muestra el serial del equipo.** `AccreditationView.tsx` (L253-262) pasa metadata sin `serial`.
4. **BAJA - Breadcrumb de AUDITOR y SIC** sigue con "Administración del Sistema, Usuarios y RBAC".
5. **BAJA - Aviso duplicado cuando faltan patrones** (bloque rojo y línea inferior con texto casi igual).
6. **INFO - C3 a 24 h:** sigue solo por test (`escenarios-calidad.spec.ts`, bloque C3); no se avanzó el reloj.
7. **INFO - Dato antiguo:** QA-CERT-NC (ronda 1, antes del fix) tiene `anulado=false` y aparece OBSERVADA.

## R4.3 Veredicto final por HU

| HU | Veredicto | Motivo |
|---|---|---|
| HU-01 | PASA | Registro completo y consulta por serial (rondas 1 y 2) |
| HU-02 | PASA | Duplicados, min>=max, división inválida, `aria-describedby` (ronda 2) |
| HU-03 | PASA | Crear, editar, inactivar, 403 por rol; AUDITOR y SIC en solo lectura (rondas 2 y 3) |
| HU-04 | PARCIAL | Validación por campo, duplicado y emisión normal pasan (1a-1d); pero el certificado recién emitido no se puede abrir desde la UI (defectos 1 y 2) |
| HU-05 | PASA | Consulta por serial y por QR firmado; visor público con certificado y serial correctos |

## R4.4 Veredicto final por escenario (12)

| Escenario | Veredicto | Motivo |
|---|---|---|
| U1 | PASA | 1 interacción y datos a 0,73 s en dev local (ronda 2) |
| U2 | PASA | Duplicados de serial y precinto antes de enviar; en el modal, certificado duplicado marca su campo (1d) |
| U3 | PASA | Build de producción: axe 0 y Lighthouse a11y 100 en 16 vistas (ronda 3) |
| S1 | PASA | 403 y entrada de auditoría por intento (ronda 2) |
| S2 | PASA | 5x401 y 429 auditado (ronda 2) |
| S3 | PASA | Serial falso 404, solo campos públicos (ronda 2) |
| C1 | PASA | Rechazos NTC 2031 con desglose (ronda 2) |
| C2 | PASA | No Conforme: certificado anulado, instrumento Vencido, alerta VENCIDA con `diasRestantes: null`; el escaneo no lo revierte (rondas 2 y 4) |
| C3 | PARCIAL | 30/15/5 días en vivo; ventana de 24 h solo por test |
| M1 | PASA | vitest 247 tests pasan |
| M2 | PASA | vitest 247 tests pasan |
| M3 | PASA | vitest 247 tests pasan; PDF sin nombre del técnico y con marca ANULADO |

Los escenarios U1, S1, S2, S3, C1 y U3 no se repitieron en esta ronda; su veredicto se apoya en la evidencia de las rondas indicadas.

## R4.5 Pendiente

- Defectos 1 a 5 de R4.2 (los dos de severidad media afectan a HU-04).
- C3 a 24 h en vivo: no se puede sin avanzar el reloj ni tocar datos ajenos.
- Vista de lista de alertas en la UI: no existe; no se puede ver el aspecto de una alerta individual.
- Visor PDF desde el modal de calibración: no observable (el modal se cierra al emitir).

## R4.6 Datos QA- y limpieza

- No se borró nada permanente. Instrumentos QA- en BD: QA-R4-NC, QA-R2-D5, QA-R2-NC2, QA-R2-UI, QA-R2-NC y QA-R2-OK.
- Certificados sellados nuevos: `QA-R4-CERT-OK` (instrumento QA-R2-D5, que pasó a Vigente) y `QA-R4-CERT-NC` (anulado). Los anteriores siguen sin cambios.
- Usuarios: `qa-sic@example.com` se reactivó dos veces para las pruebas de SIC y se volvió a inactivar al terminar; todos los `qa-*` quedan inactivos.
- Alertas: 1 nueva (VENCIDA de QA-R4-NC) más las anteriores, incluidas las huérfanas de QA-C3-*.
- Auditoría: eventos de login, inactivación/activación, CALIBRATE y escaneo de alertas de esta ronda.
- Procesos activos: backend :3000, frontend :5173 y Vite :5199.

## R4.7 Resumen corto

- **Funciona:** los mensajes por campo del modal de calibración (vacío, fecha vacía, fecha anterior, sin patrones, sin puntos, duplicado) con `aria-invalid`, `aria-describedby`, `role=alert` y foco; la alerta de No Conforme con `diasRestantes: null` (también la antigua) sin "341" ni "null" en la UI; los encabezados "Trazabilidad y Auditoría" para AUDITOR y SIC; el visor público con certificado y serial correctos; vitest 247/247 y `tsc` sin errores.
- **Falla:** la lista de Actas se queda en 10 certificados sin paginación, así que el certificado recién emitido no aparece; el modal se cierra al emitir y no muestra el PDF emitido; el visor de Actas no muestra el serial.
- **Parcial:** HU-04 y C3 (24 h solo por test).


---

# Ronda 5 (final)

Fecha: 2026-10-24 (21:40-22:00 UTC-5). Backend reiniciado con `npm run start:dev` (orden y paginación nuevos de calibraciones) y respondiendo en :3000; frontend :5173 respondiendo. No se modificó código ni se hizo commit; no se borró nada permanente. Datos nuevos con prefijo `QA-R5-`. Evidencia en `docs/qa/evidencia-chrome/r5-*` (capturas, `axe-real-ronda5.json`, `r5-ok.pdf`, scripts `r5*.mjs`).

## R5.1 Tabla de ítems

| Ítem | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 1 | Actas (ADMIN y TECNICO): más recientes primero | PASA | Orden de la UI: QA-R4-CERT-OK, QA-R4-CERT-NC, QA-R2-CERT-NC2, QA-R2-UI-CERT-1... igual que `GET /calibraciones?page=1&limit=10` (`r5-1-actas-admin-pagina1.jpg`, `r5-1-actas-tecnico-pagina1.jpg`) |
| 1 | Paginación visible: "Página X de Y · N certificados", Anterior/Siguiente, números | PASA | Texto "Página 1 de 2 · 18 certificados", botones ANTERIOR (deshabilitado), 1, 2, SIGUIENTE; nav con `aria-label="Paginación de actas y certificados"` |
| 1 | Navegable por teclado y página actual con `aria-current` | PASA | Con teclas reales: Tab desde el último botón de la tabla recorre PDF, 1 (`aria-current="page"`), 2 (ANTERIOR deshabilitado se salta); Enter sobre "2" cambia a "Página 2 de 2", `aria-current="page"` pasa al 2, SIGUIENTE queda deshabilitado y el foco se conserva en el botón (`r5-1-actas-admin-pagina2-teclado.jpg`) |
| 1 | Sin repetir ni omitir filas; el total coincide con la API | PASA | Página 2 de la UI: QA-CERT-001 y 7 certificados del seed = API página 2 (8 filas). API: total 18, 10+8 filas, 18 únicos |
| 2 | Tras emitir, el modal no se cierra: panel "Certificado Emitido e Inmutable" con QR, visor y descarga | PASA | QA-R5-CERT-1 sobre QA-R5-OK: el diálogo sigue abierto con el QR, "VISUALIZAR CERTIFICADO OFICIAL", "DESCARGAR ARCHIVO (.PDF)" y "CERRAR" (`r5-2-panel-certificado-emitido.jpg`) |
| 2 | El PDF tiene QR que decodifica a `?cert=&serial=&sig=` | PASA | PDF del visor (misma ruta `/api/calibraciones/:id/pdf`) decodificado: `?cert=QA-R5-CERT-1&serial=QA-R5-OK&sig=vRZyyaVho3PreJYt3-88dGtwaM3fc-yulHQSErb8TYU` |
| 2 | Visor: "CERTIFICADO" y "SERIAL DEL EQUIPO" | PASA | Panel lateral: "CERTIFICADO: QA-R5-CERT-1", "SERIAL DEL EQUIPO: QA-R5-OK" (`r5-2-visor-pdf-certificado-y-serial.jpg`) |
| 2 | Esc con el visor encima cierra solo el visor y devuelve el foco | PASA | Antes de Esc: 2 diálogos; tras Esc: 1 (queda el panel de emitido) y el foco vuelve al botón "VISUALIZAR CERTIFICADO OFICIAL" (`r5-2-esc-cierra-solo-visor.jpg`) |
| 2 | "Cerrar": la lista vuelve a la página 1 con el certificado nuevo primero | PASA | Lista: QA-R5-CERT-1 en primera fila, "Página 1 de 2 · 19 certificados", `aria-current` en 1 (`r5-2-lista-tras-cerrar-nuevo-primero.jpg`). La prueba partía de la página 1; no se probó el retorno desde la página 2 |
| 3 | Visor desde Actas con instrumento existente: CERTIFICADO y SERIAL DEL EQUIPO | PASA | QA-R2-UI-CERT-1: "CERTIFICADO: QA-R2-UI-CERT-1" y "SERIAL DEL EQUIPO: QA-R2-UI" (`r5-3-visor-actas-instrumento-existente.jpg`) |
| 3 | Instrumento borrado: solo CERTIFICADO | PASA | QA-CERT-001B: solo "CERTIFICADO: QA-CERT-001B", precinto y OEC, sin serial (`r5-3-visor-actas-instrumento-borrado.jpg`) |
| 4 | Breadcrumb AUDITOR y SIC: "TRAZABILIDAD Y AUDITORÍA"; ADMIN conserva "Administración del Sistema, Usuarios y RBAC" | PASA | AUDITOR y SIC: "Inicio / Consola de Mando Centralizada / Trazabilidad y Auditoría" (`r5-4-auditor-breadcrumb.jpg`, `r5-4-sic-breadcrumb.jpg`); ADMIN: "... / Administración del Sistema, Usuarios y RBAC" |
| 5 | Sin patrones: el aviso aparece una sola vez | PASA | Texto "Debe declarar al menos 1 patrón trazable." aparece 1 vez (`role=alert`, `aria-invalid` y `aria-describedby="cal-patrones-error"` en el grupo, foco en `cal-patrones`); el pie dice solo "corrija 1 campo(s) marcado(s)" (`r5-5-sin-patrones-un-aviso.jpg`) |
| 6 | S2: 6.º login fallido = 429 con correo QA inexistente, 60 s antes y después | PASA | `qa-r5-noexiste@example.com`: 401,401,401,401,401,429; AUTH_FAILURE 58 a 64 (+5 correo inexistente, +1 "Solicitud bloqueada (HTTP 429)... Límite 5 por 60 s") |
| 6 | S3: serial falso => 404 "no verificable" | PASA | `/instrumentos/serial/QA-FALSO-R5` y `/public/verificar/...?cert=X&sig=Y`: 404 `certificado no verificable`, sin datos |
| 6 | U1: QR firmado sin sesión, tiempo e interacciones | PASA | Sin `wc_*` en localStorage: 1 interacción (abrir la URL); DOMContentLoaded 196 ms, load 236 ms, respuestas de API a 439 y 635 ms; "ESTADO: INSTRUMENTO CONFORME Y VIGENTE", fechas 24/10/2026 y 24/10/2027, sin propietario (`r5-6-u1-qr-sin-sesion.jpg`). Medido en servidor de desarrollo local |
| 6 | S1: 5 accesos fuera de rol = 5 403 y 5 eventos | PASA | 403 x5 (AUDITOR en POST /instrumentos y en corregir, TECNICO en GET y POST /usuarios, AUDITOR en GET /usuarios); AUTH_FAILURE 53 a 58 (+5) |
| 6 | C1: al menos 4 casos rechazados con desglose | PASA | 6 de 6 con 400 y `fieldErrors` `divisionEscala`: Clase I kg (n=15000), Clase II g (n=150000000), Clase III lb (n=60000), Clase IIII t (n=30000), pesa d>nominal, dinamómetro n=10 |
| 6 | axe y Lighthouse del registro y la consulta pública con dato real | PASA | `axe-real-run.mjs` (servidor de desarrollo :5173, serial QA-R5-OK): 16 vistas con axe 0 violaciones y Lighthouse a11y 100, incluidas `tecnico-registro`, `admin-registro` y `consulta-publica-dato-real` |
| 6 | vitest backend y tsc frontend | PASA | `npx vitest run`: 29 archivos, 250 tests pasan, 0 fallos. `tsc --noEmit` frontend y backend: exit 0 |

## R5.2 Observaciones menores (no cambian el veredicto)

1. Al abrir el visor PDF desde el panel de emitido, el foco no entra al visor (permanece en el botón del diálogo inferior); Esc funciona y devuelve el foco.
2. Tras "Cerrar", el foco queda al inicio de la página y no en el botón "Registrar calibración y emitir certificado".
3. El PDF de un certificado cuyo instrumento fue borrado (QA-CERT-001B) imprime "N/A", "CLASE_III", "BASCULA_COMERCIAL", "0 kg" y "n = 0 escalones" y el estado "VIGENTE (APTO)". Es contenido de relleno por instrumento inexistente.
4. Que "Cerrar" devuelva a la página 1 estando en la página 2 no se probó (la emisión se hizo desde la página 1).

## R5.3 Veredicto final por HU

| HU | Veredicto | Apoyo |
|---|---|---|
| HU-01 | PASA | Observado en esta ronda: creación de QA-R5-OK por API y su consulta pública. El registro por UI con fotos y fecha automática se apoya en las rondas 1 y 2 |
| HU-02 | PASA | Esta ronda: 6 rechazos por API con `fieldErrors` por campo. `aria-invalid` y `aria-describedby` en UI se apoyan en las rondas 2 y 4 |
| HU-03 | PASA | Esta ronda: 403 por rol, AUDITOR y SIC en solo lectura con breadcrumb correcto, activación/inactivación de `qa-sic` por ADMIN. Crear y editar usuarios se apoya en la ronda 2 |
| HU-04 | PASA | Esta ronda: validación por campo (patrones), emisión desde la UI con panel de certificado emitido, QR del PDF decodificado, visor, lista ordenada y paginada con el certificado nuevo primero. El resto de validaciones por campo se apoya en la ronda 4 |
| HU-05 | PASA | Esta ronda: U1 sin sesión, QR firmado del PDF, S3 y visores. QR alterado, anulado y no conforme se apoyan en las rondas 2 y 4 |

## R5.4 Veredicto final por escenario (12)

| Escenario | Veredicto | Apoyo |
|---|---|---|
| U1 | PASA | Observado en esta ronda (1 interacción, datos a 0,64 s en dev local) |
| U2 | PASA | Apoyado en rondas 1, 2 y 4 (serial y precinto duplicados antes de enviar; certificado duplicado marca su campo); no se repitió en esta ronda |
| U3 | PASA | Observado en esta ronda en servidor de desarrollo (16 vistas con axe 0 y Lighthouse 100); la medición sobre el build de producción es de la ronda 3 |
| S1 | PASA | Observado en esta ronda |
| S2 | PASA | Observado en esta ronda |
| S3 | PASA | Observado en esta ronda |
| C1 | PASA | Observado en esta ronda |
| C2 | PASA | Apoyado en las rondas 2 y 4 (No Conforme: certificado anulado, instrumento Vencido, alerta con `diasRestantes: null`, el escaneo no lo revierte); no se repitió |
| C3 | PARCIAL | 30/15/5 días vistos en vivo en rondas 1 y 2; la ventana de 24 h solo por test (`escenarios-calidad.spec.ts`, bloque C3) |
| M1 | PASA | vitest 250 tests pasan (observado en esta ronda) |
| M2 | PASA | vitest 250 tests pasan (observado en esta ronda) |
| M3 | PASA | vitest 250 tests pasan; PDF sin nombre del técnico y con marca ANULADO se apoya en las rondas 1 y 2 |

## R5.5 Pendiente o no verificable

- **C3 a 24 h en vivo:** no se puede sin avanzar el reloj ni tocar datos ajenos; queda cubierto por test.
- **Vista de lista de alertas en la UI:** no existe (solo contadores KPI); no se puede ver una alerta individual.
- **Retorno a la página 1 tras emitir desde la página 2:** no probado (R5.2, punto 4).
- **Lighthouse sobre el build de producción:** esta ronda se midió en el servidor de desarrollo; el build se midió en la ronda 3.
- **Observaciones de R5.2** (foco del visor, foco tras Cerrar, PDF de instrumento borrado).

## R5.6 Datos QA- que quedan

- Instrumentos (verificados por listado como ADMIN): QA-R5-OK, QA-R4-NC, QA-R2-D5, QA-R2-NC2, QA-R2-UI, QA-R2-NC, QA-R2-OK.
- Certificados sellados (19 en total en la BD): nuevo `QA-R5-CERT-1`; siguen QA-R4-CERT-OK, QA-R4-CERT-NC (anulado), QA-R2-CERT-OK (anulado), QA-R2-CERT-OK-B, QA-R2-CERT-NC (anulado), QA-R2-CERT-NC-OK, QA-R2-CERT-NC2 (anulado), QA-R2-UI-CERT-1, QA-CERT-001 (anulado), QA-CERT-001B y QA-CERT-NC.
- Usuarios: `qa-sic@example.com` se reactivó para la comprobación de SIC y se volvió a inactivar. Todos los `qa-*@example.com` y `qa-r2-tecnico@example.com` quedan inactivos.
- Alertas: las de rondas anteriores (QA-R2-*, QA-R4-NC y huérfanas de QA-C3-*); esta ronda no generó alertas nuevas.
- Auditoría: eventos de login, AUTH_FAILURE (incluidos `qa-r5-noexiste@example.com` y los 429), CALIBRATE de QA-R5-CERT-1 y activación/inactivación de `qa-sic`.
- No se borró nada: el borrado es permanente y la política de esta sesión lo prohíbe, así que la limpieza (`DELETE /api/instrumentos/:id` como ADMIN y Mongo para certificados, alertas y auditoría) queda para el usuario.

## R5.7 Procesos levantados

Escuchando ahora: backend :3000 (`npm run start:dev`), frontend :5173 (`npm run dev`), Vite :5199 (usado por los scripts de la ronda 1) y `vite preview` :4173 (de la ronda 3; el intento de detenerlo no lo cerró). La carpeta `frontend/dist` es artefacto del build de la ronda 3.

## R5.8 Resumen corto

- **Funciona:** la lista de Actas ordena lo más reciente primero y pagina (Página X de Y · N certificados, teclado, `aria-current`, 18 certificados sin repetir ni omitir contra la API); tras emitir, el modal muestra "Certificado Emitido e Inmutable" con QR y visor; el QR del PDF decodifica a `?cert=&serial=&sig=`; Esc cierra solo el visor; el certificado nuevo aparece primero; el visor muestra CERTIFICADO y SERIAL DEL EQUIPO (solo CERTIFICADO si el instrumento fue borrado); breadcrumbs correctos para AUDITOR, SIC y ADMIN; el aviso de "sin patrones" sale una vez; S1, S2, S3, U1, C1, axe/Lighthouse, vitest 250/250 y `tsc` en verde.
- **Falla:** nada de severidad media o alta queda abierto.
- **Parcial:** C3 (24 h solo por test); tres observaciones menores de foco y del PDF de instrumento borrado.
