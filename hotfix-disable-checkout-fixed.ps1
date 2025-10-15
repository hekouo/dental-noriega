param(
    [string]$EnvFile = ".env.local",
    [switch]$Enable  # usa -Enable para ACTIVAR checkout; sin el switch lo desactiva
  )
  
  $ErrorActionPreference = "Stop"
  
  # Ubica la raíz del proyecto en base a la ruta del script
  $root = Split-Path -Parent $PSCommandPath
  if (-not $root) { $root = Get-Location }
  
  $envPath = Join-Path $root $EnvFile
  if (-not (Test-Path $envPath)) {
    New-Item -ItemType File -Path $envPath -Force | Out-Null
  }
  
  # Backup
  Copy-Item $envPath "$envPath.bak" -Force
  
  # Claves a forzar
  $desired = @{
    "NEXT_PUBLIC_CHECKOUT_ENABLED" = ($Enable.IsPresent ? "true" : "false")
    "CHECKOUT_READONLY"            = ($Enable.IsPresent ? "false" : "true")
  }
  
  # Carga y actualiza
  $content = Get-Content $envPath -Raw
  foreach ($k in $desired.Keys) {
    $line  = "$k=$($desired[$k])"
    $regex = "^(?m)$k\s*=.*$"
    if ($content -match $regex) { $content = [regex]::Replace($content, $regex, $line) }
    else { $content = ($content.TrimEnd(), $line) -join "`r`n" }
  }
  
  Set-Content -Path $envPath -Value $content -Encoding UTF8
  
  Write-Host "Checkout: $($desired["NEXT_PUBLIC_CHECKOUT_ENABLED"]) (READONLY=$($desired["CHECKOUT_READONLY"]))"
  Write-Host "Hecho. Reinicia tu dev server para aplicar (.env): npm run dev"
  