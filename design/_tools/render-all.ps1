#!/usr/bin/env pwsh
# v2 画板批量校验 + 渲染（headless Chrome），供人工目视复核。
# 用法: pwsh -File render-all.ps1
$ErrorActionPreference = 'Stop'
$design = 'D:\ScriptProject\dsh-reelforge\design'
$out   = Join-Path $design '_tmp'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$svgs = Get-ChildItem $design -Filter '??-RF-*.svg' | Sort-Object Name
if ($svgs.Count -eq 0) { Write-Host '没有找到 v2 画板'; exit 1 }

Write-Host '--- 几何校验 ---'
& node (Join-Path $design '_tools\check-svg.mjs') @($svgs.FullName)
$checkOk = ($LASTEXITCODE -eq 0)

Write-Host '--- 渲染 ---'
foreach ($s in $svgs) {
  $name = $s.BaseName -replace '^(\d\d)-', '$1-'
  $png = Join-Path $out "$name.png"
  & $chrome --headless --disable-gpu --no-sandbox --hide-scrollbars `
    --screenshot="$png" --window-size=560,900 "file:///$($s.FullName -replace '\\','/')" 2>&1 |
    Out-Null
  if (Test-Path $png) {
    $len = (Get-Item $png).Length
    Write-Host ("  {0,-24} {1,8} bytes" -f $s.Name, $len)
  } else {
    Write-Host ("  {0,-24} RENDER FAILED" -f $s.Name)
  }
}

# 架构图单独渲染
foreach ($a in @('ARCH-生成流水线','ARCH-三平面架构')) {
  $p = Join-Path $design "$a.svg"
  if (Test-Path $p) {
    $png = Join-Path $out "$a.png"
    $w = 1200; $h = 700
    & $chrome --headless --disable-gpu --no-sandbox --hide-scrollbars `
      --screenshot="$png" --window-size="$w,$h" "file:///$($p -replace '\\','/')" 2>&1 | Out-Null
    Write-Host ("  {0,-24} {1,8} bytes" -f "$a.svg", (Get-Item $png).Length)
  }
}
Write-Host ("check-svg 整体：{0}" -f $(if ($checkOk) { 'PASS' } else { 'FAIL' }))
