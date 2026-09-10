# 🏋️‍♂️ Weightcontrol

Sistema integral de control y seguimiento de peso y hábitos saludables. Este repositorio contiene tanto la API del backend (NestJS) como la aplicación frontend (React + Vite).

---

## 📁 Estructura del Proyecto

```text
Weightcontrol/
├── backend/                  # API REST construida con NestJS
│   ├── src/                  # Código fuente (módulos, controladores, servicios)
│   ├── test/                 # Pruebas e2e y configuración de tests
│   ├── package.json          # Dependencias y scripts del backend
│   └── tsconfig.json         # Configuración de TypeScript
├── frontend/                 # Aplicación cliente construida con React + Vite
│   ├── src/                  # Componentes, vistas y lógica de UI
│   ├── index.html            # Plantilla HTML principal
│   ├── package.json          # Dependencias y scripts del frontend
│   └── vite.config.ts        # Configuración de Vite
├── .gitignore                # Reglas de exclusión para Git (monorepo)
├── commit.sh                 # Script bash para commits interactivos
├── commit.ps1                # Script PowerShell para commits interactivos
└── README.md                 # Documentación del proyecto
```

---

## 🛠️ Tecnologías Utilizadas

| Módulo | Tecnologías Principales |
| :--- | :--- |
| **Backend** | [NestJS](https://nestjs.com/) v12, [TypeScript](https://www.typescriptlang.org/), [Vitest](https://vitest.dev/), [Supertest](https://github.com/ladjs/supertest) |
| **Frontend** | [React](https://react.dev/) v19, [Vite](https://vitejs.dev/) v8, [TypeScript](https://www.typescriptlang.org/) |
| **Entorno** | [Node.js](https://nodejs.org/) (v18+ recomendado, compatible con Node v22) |

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos

Asegúrate de tener instalados en tu máquina:
- **Node.js** (versión 18 o superior): `node -v`
- **npm** (incluido con Node.js): `npm -v`
- **Git**: `git --version`

---

### 2. Clonar el Repositorio

Abre una terminal y ejecuta el siguiente comando:

```bash
git clone https://github.com/TU_USUARIO/Weightcontrol.git
cd Weightcontrol
```

---

### 3. Configuración y Ejecución del Backend

El backend gestiona la lógica de negocio y las APIs de la aplicación.

```bash
# 1. Navegar a la carpeta del backend
cd backend

# 2. Instalar dependencias
npm install --legacy-peer-deps

# 3. Iniciar el servidor en modo desarrollo (watch mode)
npm run start:dev
```

> 🌐 **URL del Backend**: Por defecto se ejecutará en [http://localhost:3000](http://localhost:3000) (se mostrará en la consola con el logger integrado).

#### Comandos adicionales del Backend:

| Comando | Descripción |
| :--- | :--- |
| `npm run start:dev` | Inicia el backend con recarga automática al guardar cambios |
| `npm run build` | Compila el proyecto TypeScript a la carpeta `dist/` |
| `npm run start:prod` | Inicia el servidor compilado en producción |
| `npm run test` | Ejecuta las pruebas unitarias con Vitest |
| `npm run test:e2e` | Ejecuta las pruebas de integración End-to-End |

---

### 4. Configuración y Ejecución del Frontend

El frontend contiene la interfaz de usuario interactiva.

```bash
# 1. Desde la raíz o en una nueva terminal, entrar a frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo de Vite
npm run dev
```

> 💻 **URL del Frontend**: Por defecto se ejecutará en [http://localhost:5173](http://localhost:5173).

#### Comandos adicionales del Frontend:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con Hot Module Replacement (HMR) |
| `npm run build` | Compila el frontend optimizado para producción en `dist/` |
| `npm run preview` | Previsualiza localmente el build de producción |
| `npm run lint` | Ejecuta ESLint para validar buenas prácticas de código |

---

## ⚡ Automatización de Commits con `commit.sh` y `commit.ps1`

Para facilitar el flujo de trabajo con Git y estandarizar los mensajes según la convención **Conventional Commits** (`feat`, `fix`, `docs`, `refactor`, etc.), se incluyen scripts interactivos:

### Opción A: En Git Bash, Linux o macOS (`commit.sh`)

```bash
# Dar permisos de ejecución (solo necesario la primera vez en Linux/macOS):
chmod +x commit.sh

# Modo Interactivo:
./commit.sh

# Modo Rápido (pasando el mensaje directamente):
./commit.sh "feat(backend): agregar modulo de usuarios"
```

### Opción B: En Windows PowerShell (`commit.ps1`)

```powershell
# Modo Interactivo:
.\commit.ps1

# Modo Rápido:
.\commit.ps1 -Message "feat(frontend): crear vista de dashboard"
```

### ✨ ¿Qué hace el asistente de commits?
1. Muestra el estado de los archivos modificados (`git status -s`).
2. Pregunta si deseas agregar todos los cambios (`git add .`).
3. Te permite seleccionar el tipo de cambio de forma interactiva (`feat`, `fix`, `docs`, etc.).
4. Solicita el módulo/alcance opcional (ej. `backend`, `frontend`, `auth`).
5. Genera el commit con el formato estándar: `tipo(alcance): descripción`.
6. Pregunta si deseas hacer `git push` a tu rama actual de forma automática.

---

## 🛡️ Configuración de `.gitignore`

El archivo `.gitignore` en la raíz del proyecto está configurado para evitar subir archivos innecesarios o sensibles:
- 🚫 `node_modules/` (dependencias descargadas)
- 🚫 `dist/` y `build/` (archivos compilados)
- 🚫 `*.tsbuildinfo` (caché de compilación incremental de TypeScript)
- 🚫 Archivos `.env` y credenciales locales
- 🚫 Archivos temporales del sistema operativo (`.DS_Store`, `Thumbs.db`) y del editor (`.vscode`, `.idea`)

---

## 👥 Contribución

1. Crea una nueva rama para tu función: `git checkout -b feature/nueva-funcionalidad`
2. Realiza tus cambios y usa `./commit.sh` o `.\commit.ps1` para commitear.
3. Sube tu rama: `git push origin feature/nueva-funcionalidad`
4. Abre un **Pull Request**.
