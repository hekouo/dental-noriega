# verify.ps1 — Checklist de salud del catálogo (rápido y sin dramas)

$ErrorActionPreference = "SilentlyContinue"

function Ok($m){ Write-Host "[OK]  $m" -f Green }
function Warn($m){ Write-Host "[WARN] $m" -f Yellow }
function Fail($m){ Write-Host "[FAIL] $m" -f Red }

# 0) Entorno (.env)
$envOk = $true
$envFile = ".env.local"; if(!(Test-Path $envFile)){ $envFile = ".env" }
if(!(Test-Path $envFile)){
  Fail "No existe .env.local ni .env"
  $envOk = $false
}else{
  $t = Get-Content $envFile -Raw
  foreach($k in @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_INVENTORY_MODE",
    "NEXT_PUBLIC_WHATSAPP_PHONE"
  )){
    if($t -notmatch "(?m)^$k="){ Warn "Falta $k en $envFile"; $envOk = $false }
  }
  if($t -match "(?m)^SERVICE_ROLE_KEY="){
    Ok "SERVICE_ROLE_KEY presente (úsala solo en server)"
  }else{
    Warn "No se ve SERVICE_ROLE_KEY (no es obligatoria para este checklist)"
  }
}
if($envOk){ Ok ".env verificado" } else { Warn "Config .env incompleta" }

# 1) next.config.mjs permite lh3
$nextCfg = "next.config.mjs"
if(Test-Path $nextCfg){
  $cfg = Get-Content $nextCfg -Raw
  if($cfg -match "lh3\.googleusercontent\.com"){ Ok "next.config.mjs permite lh3" } else { Fail "Falta lh3.googleusercontent.com en images.remotePatterns" }
}else{
  Fail "No se encontró next.config.mjs"
}

# 2) Vista correcta en el código (solo api_catalog_with_images)
$apiMiss = Get-ChildItem -Recurse -File .\src | Select-String -Pattern '\bapi_catalog\b' |
  Where-Object { $_.Line -notmatch 'api_catalog_with_images' }
if($apiMiss){
  Fail "Hay referencias a api_catalog SIN _with_images:"
  $apiMiss | Select-Object Path,LineNumber,Line | Format-Table -AutoSize
}else{
  Ok "Todas las lecturas apuntan a api_catalog_with_images"
}

# 3) Sin imageUrl legacy fuera de stores
$legacyImg = Get-ChildItem -Recurse -File .\src | Select-String -Pattern '\bimageUrl\b' |
  Where-Object { $_.Path -notmatch 'store|checkout|cart' }
if($legacyImg){
  Fail "Quedan 'imageUrl' en UI (fuera de stores):"
  $legacyImg | Select-Object Path,LineNumber,Line | Format-Table -AutoSize
}else{
  Ok "Sin 'imageUrl' legacy en UI"
}

# 4) Páginas públicas NO deben leer cookies() en server
$publicPages = @(
  "src/app/page.tsx",
  "src/app/destacados/page.tsx",
  "src/app/tienda/page.tsx",
  "src/app/catalogo/page.tsx",
  "src/app/catalogo/[section]/page.tsx",
  "src/app/catalogo/[section]/[slug]/page.tsx"
) | Where-Object { Test-Path $_ }

$cookiesHits = @()
foreach($p in $publicPages){
  $hit = Select-String -Path $p -Pattern '\bcookies\(\)|\bheaders\(\)' -SimpleMatch
  if($hit){ $cookiesHits += $hit }
}
if($cookiesHits){
  Fail "Páginas públicas leyendo cookies()/headers() en server:"
  $cookiesHits | Select Path,LineNumber,Line | Format-Table -AutoSize
}else{
  Ok "Páginas públicas limpias (sin cookies()/headers() en server)"
}

# 5) Rutas DEBUG marcadas como dinámicas
$debugRoutes = @(
  "src/app/api/debug/catalog/route.ts",
  "src/app/api/debug/domains/route.ts",
  "src/app/api/debug/images-report/route.ts"
)
$missingDyn = @()
foreach($r in $debugRoutes){
  if(Test-Path $r){
    $txt = Get-Content $r -Raw
    if($txt -notmatch "export const dynamic\s*=\s*'force-dynamic'"){
      $missingDyn += $r
    }
  }else{
    Warn "No existe $r (si no usas esa ruta, ignora)"
  }
}
if($missingDyn.Count -gt 0){
  Fail "Falta export const dynamic='force-dynamic' en:"
  $missingDyn | ForEach-Object { Write-Host " - $_" -f Red }
}else{
  Ok "Rutas DEBUG correctamente marcadas como dinámicas"
}

# 6) Componentes clave usan image_url con ImageWithFallback
$imgComp = ".\src\components\ui\ImageWithFallback.tsx"
if(Test-Path $imgComp){
  $txt = Get-Content $imgComp -Raw
  if($txt -notmatch '"use client"'){ Fail "ImageWithFallback no tiene 'use client'" } else { Ok "ImageWithFallback es client component" }
  if($txt -match "width\s*=\s*\{"){ Ok "ImageWithFallback pasa width/height" } else { Fail "ImageWithFallback no pasa width/height" }
}else{
  Fail "No se encontró ImageWithFallback.tsx"
}

# 7) Fallback local existe
if(Test-Path ".\public\images\fallback-product.png"){ Ok "fallback-product.png existe" } else { Warn "No existe public/images/fallback-product.png" }

# 8) TypeScript y Build (rápido)
pnpm tsc --noEmit | Out-Null
if($LASTEXITCODE -eq 0){ Ok "TypeScript sin errores" } else { Fail "TypeScript reportó errores" }

pnpm build --no-lint | Out-Null
if($LASTEXITCODE -eq 0){ Ok "Build Next.js OK" } else { Fail "Build falló" }

# 9) Smoke liviano: levantar dev y ping
$port = 3002
$dev = $null
try{
  $dev = Start-Process -FilePath "pnpm" -ArgumentList @("dev","-p",$port) -PassThru
  Start-Sleep -Seconds 6
  $urls = @(
    "http://localhost:$port/",
    "http://localhost:$port/destacados",
    "http://localhost:$port/catalogo"
  )
  foreach($u in $urls){
    try{
      $r = Invoke-WebRequest -Uri $u -TimeoutSec 8
      if($r.StatusCode -ge 200 -and $r.StatusCode -lt 300){
        Ok "200 $u"
        if($r.Content -match "lh3\.googleusercontent\.com"){ Ok "Se detectan URLs lh3 en $u" }
        else { Warn "200 en $u, pero no se ven lh3 (puede ser render diferido)" }
      }else{ Fail "$u → $($r.StatusCode)" }
    }catch{
      Warn "Ping falló ${u}: $($_.Exception.Message)"
    }
  }
}finally{
  if($dev){ $dev | Stop-Process -Force -ErrorAction SilentlyContinue }
}

Write-Host "`n=== FIN CHECKLIST ===" -f Cyan
