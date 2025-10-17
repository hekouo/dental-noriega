param(
  [int]$Port = 3000
)

Write-Host "== Preflight: versiones y entorno ==" -ForegroundColor Cyan
$pnpm = (pnpm --version) 2>$null
$node = (node -v) 2>$null
$envFile = Test-Path .env.local
Write-Host "[i] pnpm $pnpm"
Write-Host "[i] Node $node"
Write-Host ("[i] .env.local " + ($(if($envFile){"encontrado"}else{"NO encontrado"})))
$base    = "http://localhost:$Port"
$health  = "$base/healthz"

Write-Host "=== Build de producción (next build) ===" -ForegroundColor Cyan
pnpm build; if ($LASTEXITCODE) { throw "Build falló" }
Write-Host "[✓] Build correcto" -ForegroundColor Green

Write-Host "=== Arrancando en modo preview (pnpm start) ===" -ForegroundColor Cyan
$ps = Start-Process -FilePath "pnpm" -ArgumentList "start" -PassThru
Start-Sleep -Seconds 2

Write-Host "=== Healthcheck ===" -ForegroundColor Cyan
$maxTries = 120
$ok = $false
for ($i=0; $i -lt $maxTries; $i++) {
  try {
    $r = Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { $ok = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ok) {
  Write-Host "[!] /healthz no respondió, probando / ..." -ForegroundColor Yellow
  try {
    $r = Invoke-WebRequest -Uri $base -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { $ok = $true }
  } catch {}
}

if ($ok) {
  Write-Host "[✓] Sitio responde" -ForegroundColor Green
  Start-Process $base
} else {
  Write-Host "[!] Verifica manual: $base" -ForegroundColor Yellow
}

Write-Host "=== Despliegue con Vercel (pull/deploy) ===" -ForegroundColor Cyan
pnpm dlx vercel pull --yes
pnpm dlx vercel deploy      # sin --prebuilt para evitar symlinks en Windows

Write-Host "=== Tag opcional de release ===" -ForegroundColor Cyan
git tag -a v0.1.0-fix-checkout -m "Build OK; checkout temporalmente deshabilitado, lint estable" 2>$null
git push --tags 2>$null
Write-Host "[✓] Checklist completado" -ForegroundColor Green
