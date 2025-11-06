# Process audit results and comment on PRs
param(
  [int]$prNumber,
  [string]$artifactDir = "temp-artifacts"
)

Write-Host "`n=== Procesando resultados de auditoría para PR #$prNumber ===" -ForegroundColor Cyan

# Buscar archivos JSON de Lighthouse
$lhJsonFiles = Get-ChildItem -Path $artifactDir -Recurse -Filter "lh-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if (-not $lhJsonFiles) {
  Write-Host "⚠️ No se encontraron archivos JSON de Lighthouse" -ForegroundColor Yellow
  return
}

$latestJson = $lhJsonFiles[0]
Write-Host "`n📄 Procesando: $($latestJson.FullName)" -ForegroundColor Green

try {
  $lhData = Get-Content $latestJson.FullName -Raw | ConvertFrom-Json
  
  # Extraer scores
  $perf = [math]::Round($lhData.categories.performance.score * 100, 0)
  $a11y = [math]::Round($lhData.categories.accessibility.score * 100, 0)
  $bp = [math]::Round($lhData.categories.'best-practices'.score * 100, 0)
  $seo = [math]::Round($lhData.categories.seo.score * 100, 0)
  
  Write-Host "`n📊 Scores Lighthouse:" -ForegroundColor Cyan
  Write-Host "  Performance: $perf" -ForegroundColor $(if ($perf -ge 80) { "Green" } else { "Red" })
  Write-Host "  Accessibility: $a11y" -ForegroundColor $(if ($a11y -ge 90) { "Green" } else { "Yellow" })
  Write-Host "  Best Practices: $bp" -ForegroundColor $(if ($bp -ge 90) { "Green" } else { "Yellow" })
  Write-Host "  SEO: $seo" -ForegroundColor $(if ($seo -ge 90) { "Green" } else { "Yellow" })
  
  # Extraer top 3 oportunidades
  $opportunities = @()
  foreach ($auditId in $lhData.audits.PSObject.Properties.Name) {
    $audit = $lhData.audits.$auditId
    if ($audit.details -and $audit.details.type -eq "opportunity" -and $audit.numericValue) {
      $opportunities += [PSCustomObject]@{
        Id = $auditId
        Title = $audit.title
        Savings = $audit.numericValue
        Unit = $audit.numericUnit
        Description = $audit.description
      }
    }
  }
  
  $top3 = $opportunities | Sort-Object Savings -Descending | Select-Object -First 3
  
  Write-Host "`n🎯 Top 3 Oportunidades:" -ForegroundColor Cyan
  foreach ($opp in $top3) {
    $savings = if ($opp.Unit -eq "millisecond") { "$([math]::Round($opp.Savings, 0))ms" } 
               elseif ($opp.Unit -eq "byte") { "$([math]::Round($opp.Savings / 1024, 1))KB" }
               else { "$($opp.Savings) $($opp.Unit)" }
    Write-Host "  - $($opp.Title): $savings" -ForegroundColor White
  }
  
  # Buscar resultados de Axe
  $axeFiles = Get-ChildItem -Path $artifactDir -Recurse -Filter "*axe*.json" -ErrorAction SilentlyContinue
  $axeViolations = @()
  
  if ($axeFiles) {
    foreach ($axeFile in $axeFiles) {
      try {
        $axeData = Get-Content $axeFile.FullName -Raw | ConvertFrom-Json
        if ($axeData.violations) {
          $axeViolations += $axeData.violations.Count
        }
      } catch {
        # Ignorar errores de parsing
      }
    }
  }
  
  $totalViolations = ($axeViolations | Measure-Object -Sum).Sum
  Write-Host "`n♿ Violaciones Axe: $totalViolations" -ForegroundColor $(if ($totalViolations -le 10) { "Green" } else { "Red" })
  
  # Crear comentario para PR
  $comment = @"
## 📊 Resultados de Auditoría (Lighthouse + Axe)

### Lighthouse Scores

| Métrica | Score | Estado |
|---------|-------|--------|
| **Performance** | $perf | $(if ($perf -ge 80) { "✅" } else { "❌" }) |
| **Accessibility** | $a11y | $(if ($a11y -ge 90) { "✅" } else { "⚠️" }) |
| **Best Practices** | $bp | $(if ($bp -ge 90) { "✅" } else { "⚠️" }) |
| **SEO** | $seo | $(if ($seo -ge 90) { "✅" } else { "⚠️" }) |

### 🎯 Top 3 Oportunidades (con ahorro estimado)

"@
  
  foreach ($opp in $top3) {
    $savings = if ($opp.Unit -eq "millisecond") { "$([math]::Round($opp.Savings, 0))ms" } 
               elseif ($opp.Unit -eq "byte") { "$([math]::Round($opp.Savings / 1024, 1))KB" }
               else { "$($opp.Savings) $($opp.Unit)" }
    $comment += "- **$($opp.Title)**: $savings`n"
  }
  
  $comment += @"

### ♿ Violaciones Axe

Total: **$totalViolations** violaciones $(if ($totalViolations -le 10) { "✅" } else { "❌" })

### ✅ Criterios para Auto-merge

- Performance ≥ 0.80: $(if ($perf -ge 80) { "✅ Cumple" } else { "❌ No cumple" })
- Accessibility ≥ 0.90: $(if ($a11y -ge 90) { "✅ Cumple" } else { "❌ No cumple" })
- Best Practices ≥ 0.90: $(if ($bp -ge 90) { "✅ Cumple" } else { "❌ No cumple" })
- SEO ≥ 0.90: $(if ($seo -ge 90) { "✅ Cumple" } else { "❌ No cumple" })
- Axe ≤ 10 violaciones: $(if ($totalViolations -le 10) { "✅ Cumple" } else { "❌ No cumple" })

**Estado general**: $(if ($perf -ge 80 -and $a11y -ge 90 -and $bp -ge 90 -and $seo -ge 90 -and $totalViolations -le 10) { "✅ Listo para auto-merge" } else { "⚠️ Requiere mejoras" })
"@
  
  # Guardar comentario
  $commentFile = "comment_pr$prNumber.txt"
  $comment | Out-File -FilePath $commentFile -Encoding UTF8
  Write-Host "`n💬 Comentario guardado en: $commentFile" -ForegroundColor Green
  
  # Retornar datos para uso posterior
  return @{
    Perf = $perf
    A11y = $a11y
    BP = $bp
    SEO = $seo
    AxeViolations = $totalViolations
    MeetsThresholds = ($perf -ge 80 -and $a11y -ge 90 -and $bp -ge 90 -and $seo -ge 90 -and $totalViolations -le 10)
    Comment = $comment
  }
  
} catch {
  Write-Host "❌ Error procesando resultados: $_" -ForegroundColor Red
  return $null
}

