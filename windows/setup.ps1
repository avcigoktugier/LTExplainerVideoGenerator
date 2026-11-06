#Requires -Version 5.1
# One-time Windows setup (windows\install.ps1 runs it; by hand, from the project folder:
#   powershell -ExecutionPolicy Bypass -File .\windows\setup.ps1
# Installs project dependencies and Claude Code, asks for the keys (.env), then puts "LT Video" on the Desktop:
# double-click -> preview starts, browser tabs open, Claude is ready. Videos render on GitHub (npm run bulut).
# Safe to run again (e.g. after moving the folder - the shortcut points to the folder's path).
# Saved as UTF-8 WITH a BOM: Windows PowerShell 5.1 reads a BOM-less file as ANSI and garbles the Turkish text.
$ErrorActionPreference = "Stop"
$Dir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AppName = "LT Video"

function Say([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Warn([string]$m) { Write-Host "!  $m" -ForegroundColor Yellow }
function Done([string]$m) { Write-Host "   $m" -ForegroundColor Green }
function Stop-Setup([string]$m) { Write-Host "`n$m" -ForegroundColor Red; Read-Host "Kapatmak için Enter'a basın" | Out-Null; exit 1 }

try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
Set-Location -LiteralPath $Dir
if (-not (Test-Path "package.json")) { Stop-Setup "package.json bulunamadı: $Dir" }
if ($Dir -match '\\OneDrive') { Warn "Proje OneDrive'ın eşitlediği bir klasörde ($Dir). Sorun çıkarsa $HOME\LTVideo altına taşıyın." }
$env:Path = (@("$HOME\.local\bin", [Environment]::GetEnvironmentVariable("Path", "Machine"), [Environment]::GetEnvironmentVariable("Path", "User")) -join ";")

Say "Node.js"
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { Stop-Setup "Node.js bulunamadı. https://nodejs.org adresinden 22 LTS'i kurun, sonra kurulum satırını tekrar yapıştırın." }
$major = [int]((& node.exe -v) -replace '^v(\d+).*', '$1')
if ($major -lt 22) { Stop-Setup "Node.js $(& node.exe -v) çok eski; 22 veya üstü gerekiyor (https://nodejs.org)." }
Done "Node $(& node.exe -v)"

# npm.cmd / npx.cmd, not npm: the .ps1 shims are blocked where scripts are disabled
Say "Proje bileşenleri kuruluyor (ilk seferde birkaç dakika)"
& npm.cmd ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Stop-Setup "Bileşenler kurulamadı (npm ci). Yukarıdaki hatanın fotoğrafını kurulumu yapan kişiye gönderin." }
& npx.cmd remotion browser ensure
if ($LASTEXITCODE -ne 0) { Warn "Önizleme tarayıcısı indirilemedi; ilk önizlemede tekrar denenecek." }

Say "Anahtarlar (.env)"
$envFile = Join-Path $Dir ".env"
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $Dir ".env.example") $envFile }
$utf8 = New-Object System.Text.UTF8Encoding($false)
# Ask only for what's still empty. Typed hidden; any character is safe (written as text, never through a shell).
function Read-Key([string]$Key, [string]$Label) {
  $text = [IO.File]::ReadAllText($envFile)
  $m = [regex]::Match($text, "(?m)^$Key=(.*)$")
  if ($m.Success -and $m.Groups[1].Value.Trim()) { Write-Host "   ${Key}: var"; return }
  $secure = Read-Host "   $Label (yapıştırın, ekranda görünmez; atlamak için Enter)" -AsSecureString
  $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
  if (-not $value) { Warn "$Key boş bırakıldı - sonra eklemek için: notepad `"$envFile`""; return }
  $line = "$Key=$value"
  if ($m.Success) { $text = $text.Remove($m.Index, $m.Length).Insert($m.Index, $line) }
  else { $text = $text.TrimEnd("`r", "`n") + "`n$line`n" }
  [IO.File]::WriteAllText($envFile, $text, $utf8)
  Done "${Key}: kaydedildi"
}
Write-Host "Kurulumu yapan kişinin size gönderdiği anahtarları yapıştırın (sağ tık = yapıştır)."
Read-Key "ELEVENLABS_API_KEY" "ElevenLabs anahtarı"
Read-Key "ELEVENLABS_VOICE_ID" "ElevenLabs ses kimliği (voice id)"
Read-Key "GITHUB_TOKEN" "GitHub anahtarı (github_pat_ ile başlar)"

Say "Claude Code"
if (-not (Get-Command claude.exe -ErrorAction SilentlyContinue)) {
  # its own process: the official installer may call exit
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm https://claude.ai/install.ps1 | iex"
  $env:Path = "$HOME\.local\bin;$env:Path"
}
if (Get-Command claude.exe -ErrorAction SilentlyContinue) { Done "Claude Code $(& claude.exe --version)" }
else { Warn "Claude Code kurulamadı - https://code.claude.com/docs/en/setup (hata 403 ise: VPN'i kapatıp tekrar deneyin)" }

Say "Masaüstüne '$AppName' koyuluyor"
$desktop = [Environment]::GetFolderPath("Desktop")   # the real one, also when OneDrive moved it
$link = Join-Path $desktop "$AppName.lnk"
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($link)
$lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$Dir\windows\session.ps1`""
$lnk.WorkingDirectory = $Dir
$icon = Join-Path $Dir "windows\icon.ico"
if (Test-Path $icon) { $lnk.IconLocation = "$icon,0" }
$lnk.Description = "Law & Trust video stüdyosu"
$lnk.Save()
Done "Oluşturuldu: $link"

Say "Bitti"
Write-Host @"

Masaüstündeki "$AppName" simgesine çift tıklayın. İlk seferde:
  - Claude giriş yapmanızı ister -> tarayıcıda açılan bağlantıyı izleyin
  - Windows güvenlik duvarı Node.js için izin sorarsa -> İzin ver
İpucu: simgeye sağ tıklayıp "Görev çubuğuna sabitle" diyebilirsiniz.
"@
Read-Host "`nKapatmak için Enter'a basın" | Out-Null
