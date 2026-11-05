# One-time update for PCs set up before the downloads page was opened to Tailscale.
# Run in an ADMIN PowerShell:  powershell -ExecutionPolicy Bypass -File server\open-exports-windows.ps1
# Result: http://<this PC's Tailscale IP>:3001 works from other Tailscale devices; :3000 stays SSH-tunnel only.
param([string]$User = "video", [string]$TaskName = "KetTek Studio")
$ErrorActionPreference = "Stop"
$TailscaleRanges = @("100.64.0.0/10", "fd7a:115c:a1e0::/48")

$blockName = "KetTek Studio - block network access"
if (Get-NetFirewallRule -DisplayName $blockName -ErrorAction SilentlyContinue) {
  Set-NetFirewallRule -DisplayName $blockName -LocalPort 3000
} else {
  New-NetFirewallRule -DisplayName $blockName -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Block | Out-Null
}
$exportsName = "KetTek Exports - Tailscale only"
if (-not (Get-NetFirewallRule -DisplayName $exportsName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $exportsName -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow | Out-Null
}
Set-NetFirewallRule -DisplayName $exportsName -Enabled True -Profile Any -RemoteAddress $TailscaleRanges
Write-Host "Firewall: 3000 blocked, 3001 open to Tailscale" -ForegroundColor Green

# Restart the background service so the downloads page listens on the network
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Get-Process -IncludeUserName -ErrorAction SilentlyContinue |
  Where-Object { $_.UserName -like "*\$User" -and $_.ProcessName -in @("node", "cmd", "chrome-headless-shell", "chrome") } |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName $TaskName
Write-Host "Service restarted. In ~30 s open http://100.123.104.28:3001 from a Tailscale device." -ForegroundColor Green
