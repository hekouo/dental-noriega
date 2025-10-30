param([string]$Prod="https://TU-DOMINIO-REAL.aqui")

$pages=@("$Prod/","$Prod/destacados","$Prod/catalogo","$Prod/catalogo/equipos")
foreach($u in $pages){
  try{
    $r=Invoke-WebRequest -Uri $u -TimeoutSec 25
    $lh3=[regex]::IsMatch($r.Content,"lh3\.googleusercontent\.com")
    $wrap=[regex]::IsMatch($r.Content,"relative w-full aspect-square bg-white")
    Write-Host ("[OK] {0} → {1} | lh3:{2} | wrappers:{3}" -f $u,$r.StatusCode,$lh3,$wrap) -ForegroundColor Green
  }catch{
    Write-Host ("[FAIL] {0} → {1}" -f $u,$_.Exception.Message) -ForegroundColor Red
  }
}


