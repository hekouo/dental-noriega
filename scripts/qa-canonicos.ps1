$ErrorActionPreference = "Stop"

# 0) Arranque dev minimizado
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process pnpm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$pnpm = (Get-Command pnpm.cmd).Source
Start-Process -FilePath $pnpm -ArgumentList @("dev","-p","3002") -WindowStyle Minimized | Out-Null
Start-Sleep -Seconds 6

# 1) Endpoints básicos
(Invoke-WebRequest "http://localhost:3002/api/warmup" -UseBasicParsing).StatusCode | Out-Null

# 2) Diagnóstico de imágenes (debe listar lh3.googleusercontent.com)
$domains = Invoke-WebRequest "http://localhost:3002/api/debug/domains" -UseBasicParsing | Select -Expand Content
Write-Host "Domains: $domains" -ForegroundColor Cyan

# 3) Las 8 PDP canónicas (todas deben 200 y NO /catalogo?query=)
$urls = @(
  "/catalogo/ortodoncia-arcos-y-resortes/arco-niti-redondo-12-14-16-18-paquete-con-10",
  "/catalogo/ortodoncia-arcos-y-resortes/arco-niti-rectangular-paquete-con-10",
  "/catalogo/ortodoncia-brackets-y-tubos/bracket-azdent-malla-100-colado",
  "/catalogo/ortodoncia-brackets-y-tubos/bracket-ceramico-roth-azdent",
  "/catalogo/ortodoncia-brackets-y-tubos/brackets-carton-mbt-roth-edgewise",
  "/catalogo/ortodoncia-brackets-y-tubos/braquet-de-autoligado-con-instrumento",
  "/catalogo/ortodoncia-brackets-y-tubos/tubos-con-malla-1eros-o-2o-molar-kit-con-200-tubos",
  "/catalogo/equipos/pieza-de-alta-con-luz-led-30-dias-garantia"
)
$base = "http://localhost:3002"
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest "$base$u" -UseBasicParsing -TimeoutSec 10
    if ($r.BaseResponse.ResponseUri.AbsolutePath -ne $u) {
      Write-Host ("REDIR " + $u + " -> " + $r.BaseResponse.ResponseUri.AbsolutePath) -ForegroundColor Yellow
    } else {
      Write-Host ("OK " + $u + " -> " + $r.StatusCode) -ForegroundColor Green
    }
  } catch {
    Write-Host ("FAIL " + $u) -ForegroundColor Red
  }
}

# 4) Cerrar dev
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process pnpm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
