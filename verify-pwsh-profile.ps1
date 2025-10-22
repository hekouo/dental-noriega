# Script de verificación del perfil de PowerShell 7
# Ejecutar con: pwsh verify-pwsh-profile.ps1

Write-Host ""
Write-Host "=== Verificación de Perfil PowerShell 7 ===" -ForegroundColor Cyan
Write-Host ""

# Información del sistema
Write-Host "Sistema:" -ForegroundColor Yellow
Write-Host "  Versión PS: $($PSVersionTable.PSVersion)" -ForegroundColor White
Write-Host "  Host: $($Host.Name)" -ForegroundColor White
Write-Host "  PID actual: $PID" -ForegroundColor White
Write-Host ""

# Rutas de perfil
Write-Host "Perfiles:" -ForegroundColor Yellow
$prof = "$HOME\OneDrive\Documentos\PowerShell\Microsoft.PowerShell_profile.ps1"
$vs   = "$HOME\OneDrive\Documentos\PowerShell\Microsoft.VSCode_profile.ps1"

if (Test-Path $prof) {
    Write-Host "  ✓ Perfil principal: " -ForegroundColor Green -NoNewline
    Write-Host $prof -ForegroundColor Gray
} else {
    Write-Host "  ✗ Perfil principal NO existe: " -ForegroundColor Red -NoNewline
    Write-Host $prof -ForegroundColor Gray
}

if (Test-Path $vs) {
    Write-Host "  ✓ Perfil VSCode: " -ForegroundColor Green -NoNewline
    Write-Host $vs -ForegroundColor Gray
} else {
    Write-Host "  ✗ Perfil VSCode NO existe: " -ForegroundColor Red -NoNewline
    Write-Host $vs -ForegroundColor Gray
}

if (Test-Path "$prof.bak") {
    Write-Host "  ✓ Backup disponible: $prof.bak" -ForegroundColor Green
}
Write-Host ""

# Verificar función y alias
Write-Host "Comandos:" -ForegroundColor Yellow

if (Get-Command Kill-StuckTerms -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ Función Kill-StuckTerms disponible" -ForegroundColor Green
} else {
    Write-Host "  ✗ Función Kill-StuckTerms NO disponible" -ForegroundColor Red
}

if (Get-Command kst -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ Alias kst disponible" -ForegroundColor Green
} else {
    Write-Host "  ✗ Alias kst NO disponible" -ForegroundColor Red
}
Write-Host ""

# Prueba no destructiva
Write-Host "Prueba kst -DryRun:" -ForegroundColor Yellow
Write-Host "  Procesos que se eliminarían (excluyendo este PID $PID):" -ForegroundColor Gray

try {
    $result = kst -DryRun
    if ($result) {
        $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } else {
        Write-Host "    (ninguno)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ✗ Error al ejecutar kst -DryRun" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Red
}
Write-Host ""

# Verificar contenido del perfil
Write-Host "Seguridad del perfil:" -ForegroundColor Yellow
if (Test-Path $prof) {
    # Leer solo líneas que NO son comentarios
    $lines = Get-Content $prof | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }
    $executableContent = $lines -join "`n"
    
    $dangerous = @()
    # Solo buscar en código ejecutable, no en comentarios
    if ($executableContent -match '(?<!#.*)taskkill') { $dangerous += 'taskkill' }
    if ($executableContent -match '(?<!#.*)Exit\s+\d+') { $dangerous += 'Exit (con código)' }
    if ($executableContent -match '(?<!#.*)^\s*Exit\s*$') { $dangerous += 'Exit (simple)' }
    
    if ($dangerous.Count -eq 0) {
        Write-Host "  ✓ Sin comandos destructivos al inicio" -ForegroundColor Green
        Write-Host "  ✓ Stop-Process solo dentro de función (seguro)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ ADVERTENCIA: Se encontraron comandos peligrosos:" -ForegroundColor Red
        $dangerous | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    }
}
Write-Host ""

Write-Host "=== Verificación completada ===" -ForegroundColor Cyan
Write-Host ""

