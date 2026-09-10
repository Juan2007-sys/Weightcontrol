# ==============================================================================
# Script de Commit Rápido e Interactivo para PowerShell (Windows)
# ==============================================================================

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   🚀 Asistente de Commits - Weightcontrol   " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

# Verificar repositorio Git
git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Este directorio no es un repositorio de Git." -ForegroundColor Red
    exit 1
}

# Mostrar estado actual
Write-Host "`n📋 Estado actual de los archivos modificados:" -ForegroundColor Yellow
git status -s

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "`n✨ No hay cambios pendientes por commitear. ¡Todo limpio!" -ForegroundColor Green
    exit 0
}

# Confirmar git add .
$addAll = Read-Host "`n¿Deseas agregar todos los archivos (git add .) ? [S/n]"
if ([string]::IsNullOrWhiteSpace($addAll)) { $addAll = "S" }

if ($addAll -match "^[Ss]$") {
    git add .
    Write-Host "✔ Archivos agregados al área de preparación (stage)." -ForegroundColor Green
} else {
    Write-Host "ℹ Agrega manualmente los archivos con 'git add <archivo>' y vuelve a ejecutar el script." -ForegroundColor Yellow
    exit 0
}

param([string]$Message = "")

if (-not [string]::IsNullOrWhiteSpace($Message)) {
    $commitMsg = $Message
} else {
    Write-Host "`n📌 Selecciona el tipo de cambio:" -ForegroundColor Magenta
    Write-Host "  1) feat     - Nueva característica o funcionalidad" -ForegroundColor Green
    Write-Host "  2) fix      - Corrección de un bug o error" -ForegroundColor Red
    Write-Host "  3) docs     - Cambios solo en la documentación (README, etc.)" -ForegroundColor Cyan
    Write-Host "  4) style    - Estilos, formateo, punto y coma" -ForegroundColor Yellow
    Write-Host "  5) refactor - Refactorización de código" -ForegroundColor Magenta
    Write-Host "  6) test     - Añadir o corregir pruebas unitarias o e2e" -ForegroundColor Cyan
    Write-Host "  7) chore    - Mantenimiento, dependencias, configs" -ForegroundColor Yellow
    Write-Host "  8) ✍ Personalizado (escribir mensaje directo)"

    $opt = Read-Host "Elige una opción [1-8]"

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
        $scope = Read-Host "`nAlcance / Módulo opcional (ej. backend, frontend, auth) [Enter para omitir]"
        $desc = Read-Host "Descripción del commit (breve y clara)"

        while ([string]::IsNullOrWhiteSpace($desc)) {
            Write-Host "⚠ La descripción no puede estar vacía." -ForegroundColor Red
            $desc = Read-Host "Descripción del commit"
        }

        if (-not [string]::IsNullOrWhiteSpace($scope)) {
            $commitMsg = "$type($scope): $desc"
        } else {
            $commitMsg = "$type`: $desc"
        }
    } else {
        $commitMsg = Read-Host "`nEscribe el mensaje completo del commit"
        while ([string]::IsNullOrWhiteSpace($commitMsg)) {
            Write-Host "⚠ El mensaje no puede estar vacío." -ForegroundColor Red
            $commitMsg = Read-Host "Escribe el mensaje completo del commit"
        }
    }
}

Write-Host "`n💬 Mensaje del commit: `"$commitMsg`"" -ForegroundColor Cyan
git commit -m "$commitMsg"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✔ ¡Commit realizado con éxito! 🎉" -ForegroundColor Green
} else {
    Write-Host "`n❌ Ocurrió un error al realizar el commit." -ForegroundColor Red
    exit 1
}

$doPush = Read-Host "`n¿Deseas hacer push a tu repositorio remoto? [s/N]"
if ($doPush -match "^[Ss]$") {
    $branch = git rev-parse --abbrev-ref HEAD
    Write-Host "`nSubiendo cambios a la rama '$branch'..." -ForegroundColor Yellow
    git push origin "$branch" 2>$null
    if ($LASTEXITCODE -ne 0) {
        git push -u origin "$branch"
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✔ ¡Push completado con éxito! 🚀" -ForegroundColor Green
    } else {
        Write-Host "⚠ No se pudo hacer push. Verifica tu configuración de remoto (git remote -v)." -ForegroundColor Red
    }
}

Write-Host "`n==============================================" -ForegroundColor Cyan
