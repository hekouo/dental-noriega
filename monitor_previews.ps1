# Monitor Preview URLs and re-run workflows
$prs = @(77, 78, 79, 80)

Write-Host "`n=== Monitoreando Preview URLs ===" -ForegroundColor Cyan

foreach ($prNum in $prs) {
  Write-Host "`nPR ${prNum}:" -ForegroundColor Yellow
  try {
    $prJson = gh pr view $prNum --json url,state,comments 2>&1
    if ($LASTEXITCODE -eq 0) {
      $pr = $prJson | ConvertFrom-Json
      Write-Host "  Estado: $($pr.state)" -ForegroundColor White
      Write-Host "  URL: $($pr.url)" -ForegroundColor Gray
      
      # Buscar Preview URL en comentarios de vercel[bot]
      $preview = $null
      foreach ($comment in $pr.comments) {
        if ($comment.author.login -eq "vercel[bot]") {
          $urlMatch = $comment.body | Select-String -Pattern "https://.*\.vercel\.app" -AllMatches
          if ($urlMatch) {
            $preview = $urlMatch.Matches[0].Value
            break
          }
        }
      }
      
      if ($preview) {
        Write-Host "  Preview URL encontrada: $preview" -ForegroundColor Green
        Write-Host "  Re-ejecutando workflow..." -ForegroundColor Yellow
        gh workflow run "Audit (Lighthouse + Axe)" -f preview_url="$preview" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
          Write-Host "  Workflow ejecutado" -ForegroundColor Green
        } else {
          Write-Host "  Error al ejecutar workflow" -ForegroundColor Red
        }
      } else {
        Write-Host "  Preview URL aun no disponible" -ForegroundColor Gray
      }
    } else {
      Write-Host "  PR no encontrado o error" -ForegroundColor Red
    }
  } catch {
    Write-Host "  Error: $_" -ForegroundColor Red
  }
}

Write-Host "`n=== Monitoreo completado ===" -ForegroundColor Cyan
