#Requires -Version 5.1
# One video-editing session, started by the "LT Video" shortcut on the Desktop:
#   1. starts the preview service (if it isn't already running)
#   2. opens the preview and the videos page in the browser
#   3. starts Claude in the project folder
#   4. when Claude is closed (/exit), stops the service it started
# Closing the window with X skips step 4; the next session then simply reuses the running service.
# Saved as UTF-8 WITH a BOM (see setup.ps1).
$Dir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $Dir
$env:Path = (@("$HOME\.local\bin", [Environment]::GetEnvironmentVariable("Path", "Machine"), [Environment]::GetEnvironmentVariable("Path", "User")) -join ";")
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$Host.UI.RawUI.WindowTitle = "LT Video"
Clear-Host

function Stop-Session([string]$m) { Write-Host $m -ForegroundColor Yellow; Read-Host "`nKapatmak için Enter'a basın" | Out-Null; exit 1 }

# this copy's ports (ports.json, see pipeline/ports.ts)
$studioPort = 3000; $exportsPort = 3001
if (Test-Path "ports.json") {
  try {
    $p = Get-Content -Raw "ports.json" | ConvertFrom-Json
    if ($p.studio) { $studioPort = [int]$p.studio }
    if ($p.exports) { $exportsPort = [int]$p.exports }
  } catch {}
}
function Test-Up { [bool](Get-NetTCPConnection -LocalPort $studioPort -State Listen -ErrorAction SilentlyContinue) }

if (-not (Test-Path "node_modules")) { Stop-Session "Kurulum tamamlanmamış (node_modules yok). Kurulumu yapan kişiye haber verin: kurulum satırı tekrar çalıştırılmalı." }
if (-not (Get-Command claude.exe -ErrorAction SilentlyContinue)) { Stop-Session "Claude Code bulunamadı. Kurulumu yapan kişiye haber verin: kurulum satırı tekrar çalıştırılmalı." }

# pick up changes others made (new scenes, fixes) before starting; never block the session on it
& git.exe pull -q --rebase --autostash origin master *> $null

$server = $null
try {
  if (Test-Up) {
    Write-Host "Stüdyo zaten açık."
  } else {
    Write-Host "Stüdyo başlatılıyor, lütfen bekleyin..."
    New-Item -ItemType Directory -Force -Path "out" | Out-Null
    $server = Start-Process -FilePath "$env:SystemRoot\System32\cmd.exe" -WorkingDirectory $Dir -WindowStyle Hidden -PassThru `
      -ArgumentList "/c npm.cmd run server >> out\server.log 2>&1"
    for ($i = 0; $i -lt 90; $i++) {
      if ((Test-Up) -or $server.HasExited) { break }
      Start-Sleep -Seconds 1
    }
  }
  if (-not (Test-Up)) { Stop-Session "Önizleme açılamadı. Kurulumu yapan kişiye şu dosyayı gönderin: $Dir\out\server.log" }

  Start-Process "http://localhost:$exportsPort"
  Start-Process "http://localhost:$studioPort"

  Clear-Host
  Write-Host @"

  Law & Trust video stüdyosu
  ─────────────────────────
  Önizleme : http://localhost:$studioPort   (değişiklikten sonra sayfayı yenileyin)

  Ne istediğinizi aşağıya Türkçe yazın. Video hazır olunca "videoyu render al" deyin:
  video internette (GitHub'da) hazırlanır, birkaç dakika sonra MASAÜSTÜNE iner.
  Bitince /exit yazın.

"@
  & claude.exe
} finally {
  if ($server -and -not $server.HasExited) {
    Write-Host "`nStüdyo kapatılıyor..."
    & taskkill.exe /T /F /PID $server.Id *> $null   # the whole tree: cmd, npm, node, Studio
  }
}
Write-Host "Görüşmek üzere! Bu pencereyi kapatabilirsiniz."
