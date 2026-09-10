# 🏋️‍♂️ Weightcontrol

Sistema integral de control y seguimiento de peso y hábitos saludables. Este repositorio contiene tanto la API del backend (NestJS) como la aplicación frontend (React + Vite).

---

## 📁 Estructura del Proyecto

```text
Weightcontrol/
├── backend/                  # API REST construida con NestJS
│   ├── src/                  # Código fuente (módulos, controladores, servicios)
│   ├── test/                 # Pruebas unitarias y e2e
│   ├── package.json          # Dependencias y scripts del backend
│   └── tsconfig.json         # Configuración de TypeScript
├── frontend/                 # Aplicación cliente construida con React + Vite
│   ├── src/                  # Componentes, vistas y lógica de UI
│   ├── index.html            # Plantilla HTML principal
│   ├── package.json          # Dependencias y scripts del frontend
│   └── vite.config.ts        # Configuración de Vite
├── .gitignore                # Reglas de exclusión para Git (monorepo)
├── commit.ps1                # Script para PowerShell en Windows (Recomendado en Windows)
├── commit.sh                 # Script para Git Bash / Linux / macOS
└── README.md                 # Documentación del proyecto
```

---

## 🛠️ Tecnologías Utilizadas

| Módulo | Tecnologías Principales |
| :--- | :--- |
| **Backend** | [NestJS](https://nestjs.com/) v12, [TypeScript](https://www.typescriptlang.org/), [Vitest](https://vitest.dev/), [Supertest](https://github.com/ladjs/supertest) |
| **Frontend** | [React](https://react.dev/) v19, [Vite](https://vitejs.dev/) v8, [TypeScript](https://www.typescriptlang.org/) |
| **Entorno** | [Node.js](https://nodejs.org/) (v18+ recomendado, testeado en Node v22) |

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos

Asegúrate de tener instalados en tu sistema:
- **Node.js** (versión 18 o superior): `node -v`
- **npm** (incluido con Node.js): `npm -v`
- **Git**: `git --version`

---

### 2. Clonar el Repositorio

Abre tu terminal (PowerShell, Git Bash o CMD) y clona el proyecto:

```bash
git clone https://github.com/Juan2007-sys/Weightcontrol.git
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

> 🌐 **URL del Backend**: Por defecto se iniciará en [http://localhost:3000](http://localhost:3000) (se indicará con el logger integrado en la consola).

#### Comandos útiles del Backend:

| Comando | Descripción |
| :--- | :--- |
| `npm run start:dev` | Inicia el backend con recarga automática en caliente al guardar cambios |
| `npm run build` | Compila el proyecto TypeScript a la carpeta `dist/` |
| `npm run start:prod` | Inicia el servidor compilado en producción |
| `npm run test` | Ejecuta las pruebas unitarias con Vitest |
| `npm run test:e2e` | Ejecuta las pruebas de integración End-to-End |

---

### 4. Configuración y Ejecución del Frontend

El frontend contiene la interfaz de usuario interactiva construida con React y Vite.

```bash
# 1. Desde la raíz o en una nueva terminal, entrar a frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo de Vite
npm run dev
```

> 💻 **URL del Frontend**: Por defecto se ejecutará en [http://localhost:5173](http://localhost:5173).

#### Comandos útiles del Frontend:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor local de desarrollo con recarga instantánea (HMR) |
| `npm run build` | Compila y optimiza el frontend para producción en `dist/` |
| `npm run preview` | Previsualiza localmente el build de producción |
| `npm run lint` | Ejecuta el linter (ESLint) para verificar la calidad del código |

---

## ⚡ Asistente de Commits (`commit.ps1` y `commit.sh`)

Para que no tengas que escribir comandos largos de Git y para estandarizar los mensajes según la convención **Conventional Commits** (`feat`, `fix`, `docs`, `refactor`, etc.), tienes dos scripts disponibles:

### 🌟 Opción 1: En PowerShell de Windows (Recomendado para Windows)

Ejecuta directamente en PowerShell:

```powershell
# Modo Asistente Interactivo:
.\commit.ps1

# Modo Rápido (pasando el mensaje directamente):
.\commit.ps1 "feat(backend): agregar modulo de usuarios"
```

> 💡 **Nota sobre PowerShell**: Si al ejecutar `.\commit.ps1` PowerShell te dice que la ejecución de scripts está deshabilitada, puedes habilitarla una sola vez en tu sesión con:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

### 🐧 Opción 2: En Git Bash, Linux o macOS (`commit.sh`)

Si usas la terminal **Git Bash**:

```bash
# Modo Asistente Interactivo:
./commit.sh

# Modo Rápido:
./commit.sh "feat(frontend): crear pantalla de login"
```

---

### ✨ ¿Qué hace el asistente de commits?
1. Detecta si hay cambios modificados en el proyecto.
2. Agrega automáticamente los cambios al área de preparación (`git add .`).
3. Te muestra un menú interactivo con colores para elegir el tipo de cambio (`feat`, `fix`, `docs`, `refactor`, etc.).
4. Solicita el módulo/alcance opcional (ej: `backend`, `frontend`, `auth`).
5. Genera el commit formateado correctamente: `tipo(alcance): descripción`.
6. Te pregunta si deseas subirlo inmediatamente a GitHub (`git push -u origin main`).

---

## 🛡️ Configuración de `.gitignore`

El archivo `.gitignore` en la raíz está configurado para mantener el repositorio limpio:
- 🚫 `node_modules/` (dependencias)
- 🚫 `dist/` y `build/` (archivos compilados)
- 🚫 `*.tsbuildinfo` (caché incremental de TypeScript)
- 🚫 Archivos `.env` y credenciales privadas
- 🚫 Archivos del sistema operativo (`.DS_Store`, `Thumbs.db`, `Desktop.ini`) y del editor (`.vscode`, `.idea`)
