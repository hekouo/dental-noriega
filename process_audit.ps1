# Script para procesar resultados de auditoría
param($RunId, $PRNumber, $URL)

$jsonPath = Get-ChildItem "artifacts_temp\audit-reports\lighthouse\*.json" | Select-Object -First 1 -ExpandProperty FullName
$json = Get-Content $jsonPath | ConvertFrom-Json

$perf = [math]::Round($json.categories.performance.score * 100, 2)
$a11y = [math]::Round($json.categories.accessibility.score * 100, 2)
$bp = [math]::Round($json.categories.'best-practices'.score * 100, 2)
$seo = [math]::Round($json.categories.seo.score * 100, 2)

# Top 3 oportunidades
$opps = @()
foreach ($key in $json.audits.PSObject.Properties.Name) {
    $audit = $json.audits.$key
    if ($audit.score -ne $null -and $audit.score -lt 1 -and $audit.details -ne $null -and $audit.details.overallSavingsMs -ne $null) {
        $opps += [PSCustomObject]@{ Title = $audit.title; Savings = $audit.details.overallSavingsMs }
    }
}
$top3 = $opps | Sort-Object -Property Savings -Descending | Select-Object -First 3

# Violaciones Axe
$axeLogs = gh run view $RunId --log 2>&1 | Select-String -Pattern "\[axe\] route="
$violations = @{
    '/' = 0
    '/destacados' = 0
    '/tienda' = 0
    '/buscar?q=arco' = 0
    '/checkout/datos' = 0
}
$axeLogs | ForEach-Object {
    if ($_ -match "route=([^\s]+)\s+violations=(\d+)") {
        $route = $matches[1]
        $count = [int]$matches[2]
        if ($violations.ContainsKey($route)) {
            $violations[$route] = $count
        }
    }
}

# Generar comentario
$comment = "🔎 Auditoría – $URL`n`n## Lighthouse`n`n• **Performance**: $perf | **Accessibility**: $a11y | **Best Practices**: $bp | **SEO**: $seo`n`n• **Top 3 oportunidades (ahorro estimado):**`n"
if ($top3.Count -gt 0) {
    $i = 1
    foreach ($opp in $top3) {
        $comment += "  $i) $($opp.Title): $($opp.Savings)ms`n"
        $i++
    }
} else {
    $comment += "  (No hay oportunidades significativas)`n"
}

$comment += "`n## Axe (≤10 violaciones/ruta)`n`n"
$comment += "• `/`: $($violations['/'])`n"
$comment += "• `/destacados`: $($violations['/destacados'])`n"
$comment += "• `/tienda`: $($violations['/tienda'])`n"
$comment += "• `/buscar?q=arco`: $($violations['/buscar?q=arco'])`n"
$comment += "• `/checkout/datos`: $($violations['/checkout/datos'])`n`n"

$perfCheck = if ($perf -ge 80) { '✔' } else { '✖' }
$a11yCheck = if ($a11y -ge 90) { '✔' } else { '✖' }
$bpCheck = if ($bp -ge 90) { '✔' } else { '✖' }
$seoCheck = if ($seo -ge 90) { '✔' } else { '✖' }
$maxV = ($violations.Values | Measure-Object -Maximum).Maximum
$axeCheck = if ($maxV -le 10) { '✔' } else { '✖' }

$comment += "**Estado umbrales**: Perf ≥0.80 $perfCheck | A11y ≥0.90 $a11yCheck | BP ≥0.90 $bpCheck | SEO ≥0.90 $seoCheck | Axe ≤10 $axeCheck`n`n"

$passes = $perf -ge 80 -and $a11y -ge 90 -and $bp -ge 90 -and $seo -ge 90 -and $maxV -le 10
$nextStep = if ($passes) { 'auto-merge activado' } else { 'subir fix mínimo y relanzar audit' }
$comment += "**Próximo paso**: $nextStep"

# Guardar y publicar
$comment | Out-File -FilePath "comment_pr$PRNumber.txt" -Encoding utf8
gh pr comment $PRNumber --body "$comment" 2>&1

# Activar auto-merge si pasa
if ($passes) {
    Write-Host "✅ Umbrales cumplidos, activando auto-merge..."
    gh pr merge $PRNumber --auto --squash 2>&1
} else {
    Write-Host "⚠️ Umbrales no cumplidos. Requiere fix."
    Write-Host "Scores: Perf=$perf A11y=$a11y BP=$bp SEO=$seo MaxViolations=$maxV"
}

return @{
    Perf = $perf
    A11y = $a11y
    BP = $bp
    SEO = $seo
    MaxViolations = $maxV
    Passes = $passes
}

