# Monitor workflow and process results
param(
  [int]$prNumber,
  [int]$maxWaitMinutes = 10
)

$startTime = Get-Date
$checkInterval = 30 # seconds

Write-Host "`n=== Monitoreando workflow para PR #$prNumber ===" -ForegroundColor Cyan
Write-Host "Tiempo máximo de espera: $maxWaitMinutes minutos" -ForegroundColor Gray

while ($true) {
  $elapsed = (Get-Date) - $startTime
  if ($elapsed.TotalMinutes -gt $maxWaitMinutes) {
    Write-Host "`n⏱️ Tiempo máximo alcanzado" -ForegroundColor Yellow
    break
  }

  $runs = gh run list --workflow="Audit (Lighthouse + Axe)" --limit 5 --json databaseId,status,conclusion,createdAt,displayTitle 2>&1 | ConvertFrom-Json
  $latestRun = $runs | Select-Object -First 1

  if ($latestRun) {
    Write-Host "`nRun #$($latestRun.databaseId): $($latestRun.status)" -ForegroundColor $(if ($latestRun.status -eq "completed") { "Green" } else { "Yellow" })
    
    if ($latestRun.status -eq "completed") {
      if ($latestRun.conclusion -eq "success") {
        Write-Host "✅ Workflow completado exitosamente" -ForegroundColor Green
        Write-Host "`nDescargando artifacts..." -ForegroundColor Cyan
        
        Remove-Item -Path "temp-artifacts" -Recurse -Force -ErrorAction SilentlyContinue
        gh run download $latestRun.databaseId --dir temp-artifacts 2>&1 | Out-Null
        
        if (Test-Path "temp-artifacts") {
          Write-Host "✅ Artifacts descargados" -ForegroundColor Green
          
          # Procesar resultados
          Write-Host "`nProcesando resultados..." -ForegroundColor Cyan
          $results = pwsh -File process_audit_results.ps1 -prNumber $prNumber -artifactDir "temp-artifacts" 2>&1
          
          if (Test-Path "comment_pr$prNumber.txt") {
            Write-Host "✅ Comentario generado" -ForegroundColor Green
            
            # Publicar comentario
            $comment = Get-Content "comment_pr$prNumber.txt" -Raw
            gh pr comment $prNumber --body "$comment" 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
              Write-Host "✅ Comentario publicado en PR #$prNumber" -ForegroundColor Green
              
              # Verificar si cumple umbrales
              $perf = ($results | Select-String -Pattern "Performance.*(\d+)" | ForEach-Object { [int]$_.Matches[0].Groups[1].Value }) | Select-Object -First 1
              if ($perf -and $perf -ge 80) {
                Write-Host "`n✅ Performance >= 80. Activando auto-merge..." -ForegroundColor Green
                gh pr merge $prNumber --auto --squash 2>&1 | Out-Null
                Write-Host "✅ Auto-merge activado" -ForegroundColor Green
                return @{ Success = $true; Perf = $perf; MeetsThresholds = $true }
              } else {
                Write-Host "`n⚠️ Performance < 80. Requiere más fixes." -ForegroundColor Yellow
                return @{ Success = $true; Perf = $perf; MeetsThresholds = $false }
              }
            } else {
              Write-Host "⚠️ Error al publicar comentario" -ForegroundColor Yellow
            }
          }
        } else {
          Write-Host "⚠️ No se pudieron descargar artifacts" -ForegroundColor Yellow
        }
      } else {
        Write-Host "❌ Workflow falló: $($latestRun.conclusion)" -ForegroundColor Red
        return @{ Success = $false }
      }
      break
    } else {
      Write-Host "⏳ Esperando... ($([math]::Round($elapsed.TotalSeconds))s)" -ForegroundColor Gray
      Start-Sleep -Seconds $checkInterval
    }
  } else {
    Write-Host "⏳ No se encontró workflow. Esperando..." -ForegroundColor Gray
    Start-Sleep -Seconds $checkInterval
  }
}

return @{ Success = $false; Timeout = $true }

