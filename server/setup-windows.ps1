#Requires -Version 5.1
<#
  Lets people edit videos on THIS Windows PC over Tailscale, each in a locked-down Windows account.

  Full setup (once):
    powershell -ExecutionPolicy Bypass -File .\server\setup-windows.ps1
      - creates the "KetTek Editors" group and the editor account "video" (standard user)
      - editors can open ONLY this project folder - not your user folder
      - installs Windows' OpenSSH Server, reachable ONLY from Tailscale addresses
      - runs the video studio (npm run server) as an always-on background task, started at boot
      - blocks port 3000 from the network (editors reach it through their SSH tunnel);
        opens the downloads page :3001 to Tailscale addresses only
      - on an editor's first login: installs Claude Code, opens the project, shows a short help text

  Add another editor account later (e.g. a restricted one for yourself), nothing else changes:
    powershell -ExecutionPolicy Bypass -File .\server\setup-windows.ps1 -AddEditor kettek

  Run both in an ADMIN Windows PowerShell, from the project folder. Safe to run again
  (e.g. to change a password or after moving the folder).
#>
param(
  [string]$User = "video",          # account that runs the studio + the first editor
  [string]$AddEditor = "",          # only create/update this editor account, then stop
  [string]$TaskName = "KetTek Studio"
)
$ErrorActionPreference = "Stop"
$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TailscaleRanges = @("100.64.0.0/10", "fd7a:115c:a1e0::/48")
$Group = "KetTek Editors"

function Say([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Warn([string]$m) { Write-Host "!  $m" -ForegroundColor Yellow }
function Done([string]$m) { Write-Host "   $m" -ForegroundColor Green }

# Create or update a standard account in the editors group. Returns its password (plain) for the task.
function Set-EditorAccount([string]$Name) {
  Say "Editor account '$Name'"
  $pw = Read-Host "Choose a password for '$Name' (typed when connecting)" -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
  if ([string]::IsNullOrWhiteSpace($plain)) { throw "Empty password - run again and type one." }
  if (Get-LocalUser -Name $Name -ErrorAction SilentlyContinue) {
    Set-LocalUser -Name $Name -Password $pw
    Done "Account exists - password updated"
  } else {
    New-LocalUser -Name $Name -Password $pw -FullName "KetTek editor" -Description "Video editing over SSH" -PasswordNeverExpires | Out-Null
    Done "Account created (standard user, no admin rights)"
  }
  # Built-in "Users" group by SID, so it also works on Turkish Windows ("Kullanicilar")
  Add-LocalGroupMember -SID "S-1-5-32-545" -Member $Name -ErrorAction SilentlyContinue
  Add-LocalGroupMember -Group $Group -Member $Name -ErrorAction SilentlyContinue
  Done "Member of '$Group' (access to $ProjectDir only)"
  return $plain
}

# A background task with a stored password needs the "Log on as a batch job" right for that account.
# Windows doesn't always grant it automatically, so add it explicitly (secedit, no extra tools).
function Grant-BatchLogon([string]$Name) {
  $sid = (Get-LocalUser -Name $Name).SID.Value
  $dir = Join-Path $env:TEMP ("kettek-secpol-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $dir | Out-Null
  try {
    $inf = Join-Path $dir "rights.inf"
    & secedit /export /cfg "$inf" /areas USER_RIGHTS | Out-Null
    $lines = @(Get-Content -Path $inf)
    $idx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^SeBatchLogonRight\s*=') { $idx = $i } }
    if ($idx -ge 0) {
      if ($lines[$idx] -match [regex]::Escape("*$sid")) { Done "'$Name' can already run background tasks"; return }
      $lines[$idx] = $lines[$idx].TrimEnd() + ",*$sid"
    } else {
      $p = [array]::IndexOf($lines, "[Privilege Rights]")
      if ($p -lt 0) { $lines += "[Privilege Rights]"; $p = $lines.Count - 1 }
      $lines = $lines[0..$p] + @("SeBatchLogonRight = *$sid") + $(if ($p + 1 -lt $lines.Count) { $lines[($p + 1)..($lines.Count - 1)] } else { @() })
    }
    Set-Content -Path $inf -Value $lines -Encoding Unicode
    & secedit /configure /db (Join-Path $dir "rights.sdb") /cfg "$inf" /areas USER_RIGHTS /quiet | Out-Null
    if ($LASTEXITCODE -ne 0) { Warn "Couldn't grant 'Log on as a batch job' to '$Name' automatically (secedit exit $LASTEXITCODE)." }
    else { Done "'$Name' may now run background tasks (Log on as a batch job)" }
  } finally {
    Remove-Item -Recurse -Force -Path $dir -ErrorAction SilentlyContinue
  }
}

# ---------------------------------------------------------------- 0. Checks
Say "Checking this PC"
if ($PSVersionTable.PSEdition -ne "Desktop") {
  throw "Run this with Windows PowerShell (not PowerShell 7):  powershell -ExecutionPolicy Bypass -File .\server\setup-windows.ps1"
}
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Open PowerShell with 'Run as administrator' and run this again."
}
if (-not (Test-Path (Join-Path $ProjectDir "package.json"))) { throw "package.json not found in $ProjectDir" }
if ($ProjectDir -like "$env:SystemDrive\Users\*") {
  throw "The project is inside a user folder ($ProjectDir). Other accounts can't reach it there. Move the folder to e.g. C:\KetTekVideo and run this script from the new place."
}
Done "Project: $ProjectDir"

# ---------------------------------------------------------------- 1. Editors group + folder access
if (-not (Get-LocalGroup -Name $Group -ErrorAction SilentlyContinue)) {
  New-LocalGroup -Name $Group -Description "Can edit the KetTek video project over SSH" | Out-Null
}
& icacls "$ProjectDir" /grant "${env:COMPUTERNAME}\${Group}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "icacls failed to grant folder access" }

if ($AddEditor) {
  if ($AddEditor -eq $env:USERNAME) { throw "Pick a new account name, not your own admin account (e.g. -AddEditor kettek)." }
  if (-not (Get-Service sshd -ErrorAction SilentlyContinue)) { throw "Run the full setup first (without -AddEditor); it installs SSH and the studio." }
  [void](Set-EditorAccount $AddEditor)
  Say "Done"
  Write-Host @"

Connect from another computer:

  ssh -L 3000:localhost:3000 -L 3001:localhost:3001 $AddEditor@<this PC's Tailscale address>

First login installs Claude Code; then run  claude  and sign in with the Claude account of whoever uses '$AddEditor'.
"@
  return
}

# ---------------------------------------------------------------- 2. Full setup: prerequisites
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { throw "Node.js not found. Install Node.js 22 LTS from https://nodejs.org (default options), open a new admin PowerShell, run again." }
if ($npm -like "$env:SystemDrive\Users\*") {
  throw "Node.js is installed only for your own account ($npm). Install Node.js 22 LTS from https://nodejs.org (installs for all users) and run again."
}
$nodeMajor = [int]((& node -v) -replace '^v(\d+).*', '$1')
if ($nodeMajor -lt 22) { throw "Node.js $(& node -v) is too old. Install Node.js 22 LTS from https://nodejs.org." }
Done "Node.js: $(& node -v)"

$tailscale = (Get-Command tailscale.exe -ErrorAction SilentlyContinue).Source
if (-not $tailscale -and (Test-Path "$env:ProgramFiles\Tailscale\tailscale.exe")) { $tailscale = "$env:ProgramFiles\Tailscale\tailscale.exe" }
if (-not $tailscale) { Warn "Tailscale is not installed. Install it from https://tailscale.com/download and sign in - editors connect through it." }

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$busy = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($busy -and -not $existingTask) {
  Warn "Port 3000 is in use (probably 'npm run studio' or 'npm run server' in a terminal)."
  Read-Host "Close that window, then press Enter to continue" | Out-Null
}

if (-not (Test-Path (Join-Path $ProjectDir "node_modules"))) {
  Say "Installing project dependencies"
  Push-Location $ProjectDir
  try { & $npm ci --no-audit --no-fund } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $ProjectDir ".env"))) { Warn ".env not found - copy .env.example to .env and add the ElevenLabs key, or voices will fail." }
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectDir "out") | Out-Null

# ---------------------------------------------------------------- 3. First editor (also runs the studio)
$plain = Set-EditorAccount $User

# ---------------------------------------------------------------- 4. SSH server (Tailscale only)
Say "OpenSSH Server"
$cap = Get-WindowsCapability -Online | Where-Object Name -like "OpenSSH.Server*" | Select-Object -First 1
if (-not $cap) { throw "OpenSSH Server isn't offered on this Windows. Install it from Settings > System > Optional features." }
if ($cap.State -ne "Installed") {
  Write-Host "   Installing (can take a few minutes)..."
  Add-WindowsCapability -Online -Name $cap.Name | Out-Null
}
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
New-Item -Path "HKLM:\SOFTWARE\OpenSSH" -Force | Out-Null
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -PropertyType String -Force `
  -Value "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" | Out-Null
if (-not (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server (sshd)" -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow | Out-Null
}
Set-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -Enabled True -Profile Any -RemoteAddress $TailscaleRanges
Done "SSH running, reachable only from Tailscale addresses"

# ---------------------------------------------------------------- 5. Keep the studio ports private
$blockName = "KetTek Studio - block network access"
if (-not (Get-NetFirewallRule -DisplayName $blockName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $blockName -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Block | Out-Null
}
Set-NetFirewallRule -DisplayName $blockName -LocalPort 3000 # older setups also blocked 3001
$exportsName = "KetTek Exports - Tailscale only"
if (-not (Get-NetFirewallRule -DisplayName $exportsName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $exportsName -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow | Out-Null
}
Set-NetFirewallRule -DisplayName $exportsName -Enabled True -Profile Any -RemoteAddress $TailscaleRanges
Done "Port 3000 blocked from the network (SSH tunnel only); downloads page :3001 open to Tailscale addresses"

# ---------------------------------------------------------------- 6. Login banner + first-login Claude Code install
Say "Login message for editors"
try { Set-ExecutionPolicy RemoteSigned -Scope LocalMachine -Force -ErrorAction Stop } catch { Warn "Couldn't set the execution policy ($($_.Exception.Message)). If a login shows script errors, run: Set-ExecutionPolicy RemoteSigned -Scope LocalMachine" }
$profilePath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\profile.ps1"
$startMark = "# >>> kettek video >>>"
$endMark = "# <<< kettek video <<<"
$block = @'
# >>> kettek video >>>
# Runs only for members of the editors group, in their own SSH login shell (not in shells Claude Code starts)
if (-not $env:KETTEK_SESSION -and ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole("$env:COMPUTERNAME\__GROUP__")) {
  $env:KETTEK_SESSION = '1'
  try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
  $env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
  Set-Location -LiteralPath '__DIR__'
  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host 'Claude Code kuruluyor (sadece ilk girişte, 1-2 dakika)...' -ForegroundColor Yellow
    try { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression } catch { Write-Host "Kurulum başarısız: $($_.Exception.Message)" -ForegroundColor Red }
  }
  # `claude` inside the project folder runs without permission prompts (deny rules such as .env still apply);
  # anywhere else it runs normally. The first start shows a one-time warning: choose "Yes, I accept".
  function global:claude {
    $exe = (Get-Command claude -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (-not $exe) { Write-Host 'Claude Code bulunamadı.' -ForegroundColor Red; return }
    $root = '__DIR__'
    $here = (Get-Location).ProviderPath
    if ($here -eq $root -or $here.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) {
      & $exe --permission-mode bypassPermissions @args
    } else {
      & $exe @args
    }
  }
  Write-Host ''
  Write-Host '  KetTek video stüdyosu' -ForegroundColor Cyan
  Write-Host '  ---------------------'
  Write-Host '  Önizleme : http://localhost:3000'
  Write-Host '  Videolar : http://localhost:3001'
  Write-Host '  Başlamak : claude   (sonra ne istediğini Türkçe yaz; bu klasörde onay sormaz)'
  Write-Host ''
}
# <<< kettek video <<<
'@
$block = $block.Replace("__GROUP__", $Group).Replace("__DIR__", $ProjectDir.Replace("'", "''"))
$current = if (Test-Path $profilePath) { Get-Content -Raw -Path $profilePath } else { "" }
if ($null -eq $current) { $current = "" }
$pattern = "(?s)\r?\n?" + [regex]::Escape($startMark) + ".*?" + [regex]::Escape($endMark) + "\r?\n?"
$current = [regex]::Replace($current, $pattern, "")
Set-Content -Path $profilePath -Value ($current.TrimEnd() + "`r`n`r`n" + $block + "`r`n") -Encoding UTF8
Done "Banner installed (only for '$Group' members)"

# ---------------------------------------------------------------- 7. Always-on studio task
Say "Background task '$TaskName' (starts at boot, restarts if it stops)"
if ($existingTask) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
# Stop leftovers of a previous run (Studio, its Chrome) so port 3000 is free
Get-Process -IncludeUserName -ErrorAction SilentlyContinue |
  Where-Object { $_.UserName -like "*\$User" -and $_.ProcessName -in @("node", "cmd", "chrome-headless-shell", "chrome") } |
  Stop-Process -Force -ErrorAction SilentlyContinue

Grant-BatchLogon $User
$log = Join-Path $ProjectDir "out\server.log"
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\cmd.exe" -WorkingDirectory $ProjectDir `
  -Argument "/c cd /d `"$ProjectDir`" && `"$npm`" run server >> `"$log`" 2>&1"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -User "$env:COMPUTERNAME\$User" -Password $plain -RunLevel Limited -Force | Out-Null
$plain = $null
Start-ScheduledTask -TaskName $TaskName

Write-Host "   Waiting for the studio to start (first start can take a minute)..."
$up = $false
for ($i = 0; $i -lt 90; $i++) {
  if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { $up = $true; break }
  Start-Sleep -Seconds 2
}
if ($up) { Done "Studio is running: open http://localhost:3000 on this PC to check" }
else {
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  $state = (Get-ScheduledTask -TaskName $TaskName).State
  Warn "Studio didn't start (task state: $state, result: 0x$('{0:X}' -f $info.LastTaskResult))."
  if (Test-Path $log) {
    Warn "Last lines of $($log):"
    Get-Content -Path $log -Tail 20 | ForEach-Object { Write-Host "     $_" }
  } elseif ($info.LastTaskResult -eq 0x41303) {
    Warn "Windows never launched the task. Paste this output to Claude, plus the result of:"
    Write-Host "     Get-WinEvent -LogName System -MaxEvents 30 | Where-Object Message -like '*$User*' | Format-List TimeCreated,Message"
  }
}

# ---------------------------------------------------------------- 8. Sleep
Say "Power"
$ans = Read-Host "Stop this PC from sleeping while plugged in? Nobody can connect while it sleeps. (Y/n)"
if ($ans -notmatch '^[nN]') {
  & powercfg /change standby-timeout-ac 0
  & powercfg /change hibernate-timeout-ac 0
  Done "Sleep on AC power: off (undo in Settings > System > Power)"
}

# ---------------------------------------------------------------- 9. Summary
$address = "<this PC's Tailscale name>"
if ($tailscale) {
  try {
    $st = & $tailscale status --json | ConvertFrom-Json
    if ($st.Self.DNSName) { $address = $st.Self.DNSName.TrimEnd(".") } elseif ($st.Self.TailscaleIPs) { $address = $st.Self.TailscaleIPs[0] }
  } catch {}
}
Say "Done"
Write-Host @"

Connect command for '$User':

  ssh -L 3000:localhost:3000 -L 3001:localhost:3001 $User@$address

or the shortcut for ~/.ssh/config on the other computer (then just: ssh kettek):

  Host kettek
    HostName $address
    User $User
    LocalForward 3000 localhost:3000
    LocalForward 3001 localhost:3001

Still to do (one time):
  1. Tailscale tray icon > Preferences > Run unattended  (keeps Tailscale up when you're logged out)
  2. https://login.tailscale.com/admin/machines > this PC > ... > Share > her e-mail
  3. Send her server\KULLANIM.md, the address above, and the password.
  Your own restricted account:  powershell -ExecutionPolicy Bypass -File .\server\setup-windows.ps1 -AddEditor kettek
"@
