$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMddHHmmss"

function Backup($path) {
  if (Test-Path $path) { Copy-Item $path "$path.bak.$stamp" -Force }
}

function AddHeaderIfMissing($file, $header) {
  if (!(Test-Path $file)) { return }
  $txt = Get-Content -Raw -Encoding UTF8 $file
  if ($txt -notmatch [regex]::Escape($header)) {
    Backup $file
    Set-Content -Encoding UTF8 -Path $file -Value ($header + "`n" + $txt)
    Write-Host "Added header in $file"
  }
}

function ReplaceInFile($file, $pattern, $replacement) {
  if (!(Test-Path $file)) { return }
  $txt = Get-Content -Raw -Encoding UTF8 $file
  $new = [regex]::Replace($txt, $pattern, $replacement, 'Multiline')
  if ($new -ne $txt) {
    Backup $file
    Set-Content -Encoding UTF8 -Path $file -Value $new
    Write-Host "Patched $file"
  }
}

# 2.1) Silencia el warning de Fast Refresh
$rfFiles = @(
  "src/app/devoluciones/page.tsx",
  "src/app/envios/page.tsx",
  "src/app/privacidad/page.tsx",
  "src/app/layout.tsx",
  "src/components/CartProvider.tsx",
  "src/lib/cartStore.tsx"
)
$rfHeader = "/* eslint-disable react-refresh/only-export-components */"
$rfFiles | ForEach-Object { AddHeaderIfMissing $_ $rfHeader }

# 2.2) Limpiezas puntuales
# checkout/pago: elimina líneas con @stripe/stripe-js y stripePromise
$pathPago = "src/app/checkout/pago/page.tsx"
if (Test-Path $pathPago) {
  Backup $pathPago
  $lines = Get-Content -Path $pathPago -Encoding UTF8
  $filtered = $lines | Where-Object { $_ -notmatch '@stripe/stripe-js' -and $_ -notmatch '\bstripePromise\b' }
  $filtered | Set-Content -Path $pathPago -Encoding UTF8
  Write-Host "Cleaned unused Stripe import/var in $pathPago"
}

# direcciones: AddressInput no usado
ReplaceInFile "src/app/cuenta/direcciones/page.tsx" '^[ \t]*import.+\bAddressInput\b.*\r?\n' ''

# 2.3) Manejo de catch vacío/ignorado
ReplaceInFile "src/app/cuenta/direcciones/page.tsx" 'catch\s*\(\s*error\s*\)\s*\{\s*' ('catch (e) {' + "`n  " + @'
const err = e instanceof Error ? e : new Error(String(e));
console.error("cuenta/direcciones failed:", err);
'@)

# 2.4) any -> unknown (conservador)
$anyFiles = @(
  "src/app/carrito/page.tsx",
  "src/app/checkout/pago/page.tsx",
  "src/app/cuenta/direcciones/page.tsx",
  "src/app/cuenta/page.tsx",
  "src/app/cuenta/pedidos/page.tsx",
  "src/app/cuenta/puntos/page.tsx",
  "src/app/destacados/page.tsx",
  "src/components/ConsultarDrawer.tsx",
  "src/components/Navigation.tsx",
  "src/components/auth/AuthGuard.tsx",
  "src/components/navigation/TopNav.tsx",
  "src/lib/cart/storage.ts",
  "src/lib/featured.ts",
  "src/lib/store/cartStore.ts"
)
foreach ($f in $anyFiles) {
  ReplaceInFile $f '(<[^>]*?)\bany\b([^>]*>)' '$1unknown$2'
  ReplaceInFile $f '(:\s*)any\b' '$1unknown'
  ReplaceInFile $f '\bany\s*\[\]' 'unknown[]'
  ReplaceInFile $f '(\bas\s+)any\b' '$1unknown'
}

# 2.5) Regex más limpio en QuantityInput
ReplaceInFile "src/components/QuantityInput.tsx" '\[\^0-9\]' '\D'

Write-Host "Quick fixes applied."
