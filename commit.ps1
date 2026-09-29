# ==============================================================================
# Script de Commit Rapido e Interactivo para PowerShell (Windows)
# ==============================================================================

param(
    [Alias("msg")]
    [string]$m = "",

    [Parameter(Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$Message
)

$commitMessage = if (-not [string]::IsNullOrWhiteSpace($m)) {
    $m.Trim()
} elseif ($Message) {
    ($Message -join " ").Trim()
} else {
    ""
}

# 1. Verificar y ubicarse en la raiz del repositorio Git
$gitRoot = (git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitRoot)) {
    Write-Host ""
    Write-Host "[ERROR] Este directorio no es un repositorio de Git." -ForegroundColor Red
    exit 1
}
Set-Location $gitRoot

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   Asistente de Commits - WeightControl       " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

# 2. Informacion de usuario y rama
$authorName = (git config user.name)
$authorEmail = (git config user.email)
$branch = (git branch --show-current)
if ([string]::IsNullOrWhiteSpace($branch)) { $branch = "main" }

if (-not [string]::IsNullOrWhiteSpace($authorName)) {
    Write-Host "Autor: $authorName <$authorEmail>" -ForegroundColor DarkGray
}
Write-Host "Rama:  $branch" -ForegroundColor DarkCyan

# 3. Mostrar estado actual de archivos
Write-Host ""
Write-Host "[ESTADO] Archivos pendientes:" -ForegroundColor Yellow
git status -s

$gitStatus = git status --porcelain
if (-not $gitStatus -or [string]::IsNullOrWhiteSpace("$gitStatus")) {
    Write-Host ""
    Write-Host "[OK] Todos tus archivos ya estan guardados en commits locales." -ForegroundColor Green
    Write-Host ""
    $pushExisting = Read-Host "Deseas subir (push) los commits existentes a GitHub ($branch)? [S/n]"
    if ([string]::IsNullOrWhiteSpace($pushExisting)) { $pushExisting = "S" }
    
    if ($pushExisting -match "^[Ss]$") {
        Write-Host "`nSubiendo cambios a origin/$branch..." -ForegroundColor Yellow
        git push -u origin "$branch"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n[OK] Subida completada con exito a GitHub!" -ForegroundColor Green
        } else {
            Write-Host "`n[ALERTA] Hubo un detalle al hacer push. Revisa la autenticacion con tu cuenta de GitHub." -ForegroundColor Red
        }
    }
    Write-Host "==============================================`n" -ForegroundColor Cyan
    exit 0
}

# 4. Preguntar si desea agregar todos los cambios (git add .)
Write-Host ""
if (-not [string]::IsNullOrWhiteSpace($commitMessage)) {
    # Modo rapido directo si se paso mensaje
    git add .
    Write-Host "[OK] Archivos agregados al area de preparacion (stage)." -ForegroundColor Green
} else {
    $addAll = Read-Host "Deseas agregar todos los archivos nuevos/modificados (git add .) ? [S/n]"
    if ([string]::IsNullOrWhiteSpace($addAll)) { $addAll = "S" }

    if ($addAll -match "^[Ss]$") {
        git add .
        Write-Host "[OK] Archivos agregados al area de preparacion (stage)." -ForegroundColor Green
    } else {
        Write-Host "[INFO] Agrega manualmente los archivos con 'git add <archivo>' y vuelve a ejecutar el script." -ForegroundColor Yellow
        exit 0
    }
}

# 5. Construir el mensaje del commit
if (-not [string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMsg = $commitMessage
} else {
    Write-Host ""
    Write-Host "Selecciona el tipo de cambio:" -ForegroundColor Magenta
    Write-Host "  1) feat     - Nueva caracteristica o funcionalidad" -ForegroundColor Green
    Write-Host "  2) fix      - Correccion de un bug o error" -ForegroundColor Red
    Write-Host "  3) docs     - Cambios en la documentacion (README, etc.)" -ForegroundColor Cyan
    Write-Host "  4) style    - Estilos, formateo, espaciados" -ForegroundColor Yellow
    Write-Host "  5) refactor - Refactorizacion de codigo" -ForegroundColor Magenta
    Write-Host "  6) test     - Anadir o corregir pruebas unitarias o e2e" -ForegroundColor Cyan
    Write-Host "  7) chore    - Mantenimiento, dependencias, configuraciones" -ForegroundColor Yellow
    Write-Host "  8) Personalizado (escribir mensaje directo)"

    $opt = Read-Host "Elige una opcion [1-8]"

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
        $scope = Read-Host "Alcance / Modulo opcional (ej. backend, frontend, calibraciones) [Enter para omitir]"
        $desc = Read-Host "Descripcion del commit (breve y clara)"

        while ([string]::IsNullOrWhiteSpace($desc)) {
            Write-Host "[ALERTA] La descripcion no puede estar vacia." -ForegroundColor Red
            $desc = Read-Host "Descripcion del commit"
        }

        if (-not [string]::IsNullOrWhiteSpace($scope)) {
            $commitMsg = "$type($scope): $desc"
        } else {
            $commitMsg = "$type`: $desc"
        }
    } else {
        Write-Host ""
        $commitMsg = Read-Host "Escribe el mensaje completo del commit"
        while ([string]::IsNullOrWhiteSpace($commitMsg)) {
            Write-Host "[ALERTA] El mensaje no puede estar vacio." -ForegroundColor Red
            $commitMsg = Read-Host "Escribe el mensaje completo del commit"
        }
    }
}

# 6. Ejecutar commit
Write-Host ""
Write-Host "Mensaje del commit: `"$commitMsg`"" -ForegroundColor Cyan
git commit -m "$commitMsg"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Commit realizado con exito!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Ocurrio un error al realizar el commit." -ForegroundColor Red
    exit 1
}

# 7. Preguntar si desea hacer push al repositorio remoto de GitHub
Write-Host ""
$doPush = Read-Host "Deseas hacer push a GitHub ($branch)? [S/n]"
if ([string]::IsNullOrWhiteSpace($doPush)) { $doPush = "S" }

if ($doPush -match "^[Ss]$") {
    $originUrl = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($originUrl)) {
        Write-Host "[ALERTA] No tienes un repositorio remoto configurado como 'origin'." -ForegroundColor Yellow
        Write-Host "Configuralo con: git remote add origin https://github.com/Juan2007-sys/Weightcontrol.git" -ForegroundColor Cyan
        exit 1
    }

    Write-Host ""
    Write-Host "Subiendo cambios a origin/$branch..." -ForegroundColor Yellow
    
    git push -u origin "$branch"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Subida completada con exito a GitHub!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ALERTA] No se pudo hacer push automaticamente. Revisa tus credenciales de git." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan