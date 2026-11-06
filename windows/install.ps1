# One line in PowerShell installs everything on Windows:
#   irm https://raw.githubusercontent.com/avcigoktugier/LTExplainerVideoGenerator/master/windows/install.ps1 | iex
# Installs Git and Node.js if missing (winget), downloads the project to ~\LTVideo (or updates it),
# then runs windows\setup.ps1. Safe to run again.
# Runs through iex inside the person's own shell: everything stays in this scriptblock, and it never calls exit
# (that would close their window). Saved WITHOUT a BOM on purpose: iex chokes on a leading BOM.
& {
  $ErrorActionPreference = "Stop"
  $Repo = "https://github.com/avcigoktugier/LTExplainerVideoGenerator.git"
  $Dir = Join-Path $HOME "LTVideo"

  function Say([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
  function Warn([string]$m) { Write-Host "!  $m" -ForegroundColor Yellow }
  function Update-PathFromSystem {
    $env:Path = (@("$HOME\.local\bin", [Environment]::GetEnvironmentVariable("Path", "Machine"), [Environment]::GetEnvironmentVariable("Path", "User")) -join ";")
  }
  # Install a program with winget when it's missing; without winget, open its download page.
  function Install-Missing([string]$Exe, [string]$WingetId, [string]$Name, [string]$Url) {
    if (Get-Command $Exe -ErrorAction SilentlyContinue) { return $true }
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
      Write-Host "   $Name kuruluyor (Windows izin isterse 'Evet' deyin)..."
      & winget.exe install -e --id $WingetId --accept-source-agreements --accept-package-agreements
      Update-PathFromSystem
      if (Get-Command $Exe -ErrorAction SilentlyContinue) { return $true }
    }
    Warn "$Name gerekiyor. İndirme sayfası açılıyor: kurun (ayarları değiştirmeden), sonra YENİ bir PowerShell penceresinde bu satırı tekrar yapıştırın."
    Start-Process $Url
    return $false
  }

  if ($PSVersionTable.Platform -and $PSVersionTable.Platform -ne "Win32NT") { Write-Host "Bu kurulum Windows içindir."; return }
  Update-PathFromSystem

  Say "Git"
  if (-not (Install-Missing "git.exe" "Git.Git" "Git" "https://git-scm.com/download/win")) { return }

  Say "Node.js"
  if (-not (Install-Missing "node.exe" "OpenJS.NodeJS.LTS" "Node.js" "https://nodejs.org/en/download")) { return }
  $major = [int]((& node.exe -v) -replace '^v(\d+).*', '$1')
  if ($major -lt 22) {
    Warn "Node.js $(& node.exe -v) çok eski, 22 veya üstü gerekiyor. İndirme sayfası açılıyor: kurun, sonra YENİ bir PowerShell penceresinde bu satırı tekrar yapıştırın."
    Start-Process "https://nodejs.org/en/download"
    return
  }
  Write-Host "   Node $(& node.exe -v)"

  Say "Proje"
  if (Test-Path (Join-Path $Dir ".git")) {
    & git.exe -C $Dir pull -q --rebase origin master
    if ($LASTEXITCODE -ne 0) { Warn "Güncelleme alınamadı, mevcut kopya kullanılıyor." }
  } elseif (Test-Path $Dir) {
    throw "$Dir klasörü var ama proje değil. Klasörü silin ya da adını değiştirin, sonra bu satırı tekrar yapıştırın."
  } else {
    & git.exe clone -q $Repo $Dir
    if ($LASTEXITCODE -ne 0) { throw "Proje indirilemedi (git clone). İnternet bağlantısını kontrol edip tekrar deneyin." }
  }

  # a separate Windows PowerShell, so the execution policy doesn't matter and the setup can't close this window
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dir "windows\setup.ps1")
}
