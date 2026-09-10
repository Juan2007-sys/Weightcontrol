# ==============================================================================
# Script de Commit Rápido e Interactivo para PowerShell (Windows)
# ==============================================================================

param(
    [Parameter(Position=0)]
    [string]$Message = ""
)

Clear-Host
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   🚀 Asistente de Commits - Weightcontrol   " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Verificar si es un repositorio Git
git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error: Este directorio no es un repositorio de Git." -ForegroundColor Red
    exit 1
}

# 2. Mostrar estado actual
Write-Host "`n📋 Estado actual de los archivos modificados:" -ForegroundColor Yellow
git status -s

$status = (git status --porcelain).Trim()
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "`n✨ No hay cambios pendientes por commitear. ¡Todo limpio!" -ForegroundColor Green
    Write-Host "==============================================`n" -ForegroundColor Cyan
    exit 0
}

# 3. Preguntar si desea agregar todos los cambios (git add .)
Write-Host ""
$addAll = Read-Host " ¿Deseas agregar todos los archivos (git add .) ? [S/n]"
if ([string]::IsNullOrWhiteSpace($addAll)) { $addAll = "S" }

if ($addAll -match "^[Ss]$") {
    git add .
    Write-Host "✔ Archivos agregados al área de preparación (stage)." -ForegroundColor Green
} else {
    Write-Host "ℹ Agrega manualmente los archivos con 'git add <archivo>' y vuelve a ejecutar el script." -ForegroundColor Yellow
    exit 0
}

# 4. Construir el mensaje del commit
if (-not [string]::IsNullOrWhiteSpace($Message)) {
    $commitMsg = $Message
} else {
    Write-Host "`n📌 Selecciona el tipo de cambio:" -ForegroundColor Magenta
    Write-Host "  1) feat     - Nueva característica o funcionalidad" -ForegroundColor Green
    Write-Host "  2) fix      - Corrección de un bug o error" -ForegroundColor Red
    Write-Host "  3) docs     - Cambios en la documentación (README, etc.)" -ForegroundColor Cyan
    Write-Host "  4) style    - Estilos, formateo, espaciados" -ForegroundColor Yellow
    Write-Host "  5) refactor - Refactorización de código" -ForegroundColor Magenta
    Write-Host "  6) test     - Añadir o corregir pruebas unitarias o e2e" -ForegroundColor Cyan
    Write-Host "  7) chore    - Mantenimiento, dependencias, configuraciones" -ForegroundColor Yellow
    Write-Host "  8) ✍ Personalizado (escribir mensaje directo)"

    $opt = Read-Host " Elige una opción [1-8]"

    $type = switch ($opt) {
        "1" { "feat" }
        "2" { "fix" }
        "3" { "docs" }
        "4" { "style" }
        "5" { "refactor" }
        "6" { "test" }
        "7" { "chore" }
        Default { "" }
    }

    if ($type -ne "") {
        Write-Host ""
        $scope = Read-Host " Alcance / Módulo opcional (ej. backend, frontend, auth) [Enter para omitir]"
        $desc = Read-Host " Descripción del commit (breve y clara)"

        while ([string]::IsNullOrWhiteSpace($desc)) {
            Write-Host "⚠ La descripción no puede estar vacía." -ForegroundColor Red
            $desc = Read-Host " Descripción del commit"
        }

        if (-not [string]::IsNullOrWhiteSpace($scope)) {
            $commitMsg = "$type($scope): $desc"
        } else {
            $commitMsg = "$type`: $desc"
        }
    } else {
        Write-Host ""
        $commitMsg = Read-Host " Escribe el mensaje completo del commit"
        while ([string]::IsNullOrWhiteSpace($commitMsg)) {
            Write-Host "⚠ El mensaje no puede estar vacío." -ForegroundColor Red
            $commitMsg = Read-Host " Escribe el mensaje completo del commit"
        }
    }
}

# 5. Ejecutar commit
Write-Host "`n💬 Mensaje del commit: `"$commitMsg`"" -ForegroundColor Cyan
git commit -m "$commitMsg"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✔ ¡Commit realizado con éxito! 🎉" -ForegroundColor Green
} else {
    Write-Host "`n❌ Ocurrió un error al realizar el commit." -ForegroundColor Red
    exit 1
}

# 6. Preguntar si desea hacer push al repositorio remoto
Write-Host ""
$doPush = Read-Host " ¿Deseas hacer push a GitHub? [S/n]"
if ([string]::IsNullOrWhiteSpace($doPush)) { $doPush = "S" }

if ($doPush -match "^[Ss]$") {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    Write-Host "`nSubiendo cambios a origin/$branch..." -ForegroundColor Yellow
    
    git push -u origin "$branch"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✔ ¡Push completado con éxito a GitHub! 🚀" -ForegroundColor Green
    } else {
        Write-Host "`n⚠ Hubo un problema al hacer push. Verifica tu conexión o autenticación de GitHub." -ForegroundColor Red
    }
}

Write-Host "`n==============================================" -ForegroundColor Cyan
