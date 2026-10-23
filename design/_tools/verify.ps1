# 校验 + 渲染单张（或多张）画板
# 用法: pwsh -File verify.ps1 01-RF-Workbench 02-RF-Intake
#      pwsh -File verify.ps1 --no-render 01-RF-Workbench
$ErrorActionPreference = 'Stop'
$d = Split-Path -Parent $PSScriptRoot        # design\
$root = Split-Path -Parent $d                # 仓库根
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

$args2 = $args
$render = $true
if ($args2.Count -gt 0 -and $args2[0] -eq '--no-render') { $render = $false; $args2 = $args2[1..($args2.Count-1)] }
$files = @()
foreach ($a in $args2) {
  $cands = @((Join-Path $d $a), (Join-Path $root $a), $a)
  $hit = $cands | Where-Object { Test-Path $_ -PathType Leaf } | Select-Object -First 1
  if ($hit) { $files += (Resolve-Path $hit).Path } else { Write-Host "MISS $a"; exit 2 }
}
if ($files.Count -eq 0) { Write-Host 'no files'; exit 2 }

Write-Host '=== check-svg ==='
& node (Join-Path $d '_tools\check-svg.mjs') @files
$svgOk = ($LASTEXITCODE -eq 0)

Write-Host '=== check-inset ==='
& node (Join-Path $d '_tools\check-inset.mjs') @files

Write-Host '=== check-overlap ==='
& node (Join-Path $d '_tools\check-overlap.mjs') @files

if ($render) {
  $out = Join-Path $d '_tmp'
  if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
  foreach ($f in $files) {
    $n = [System.IO.Path]::GetFileNameWithoutExtension($f)
    $png = Join-Path $out "$n.png"
    & $chrome --headless --disable-gpu --no-sandbox --hide-scrollbars --screenshot="$png" --window-size=560,900 "file:///$($f -replace '\\','/')" 2>$null | Out-Null
    if (Test-Path $png) { Write-Host "RENDER $n.png" } else { Write-Host "RENDER FAIL $n" }
  }
}

if (-not $svgOk) { exit 1 }
Write-Host 'ALL CHECKS DONE'
