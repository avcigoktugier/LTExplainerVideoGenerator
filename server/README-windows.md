# Running the studio on your Windows PC (Tailscale)

Result: your teammate connects to your PC over Tailscale with `ssh kettek`, types `claude`, and talks. The preview (localhost:3000) and the downloads page (localhost:3001) are always on. She logs in to her **own** Windows account (`video`), which can only reach this project folder — not your files.

Her guide: `server/KULLANIM.md` (Turkish).

## Before you start (once)
1. **Node.js 22 LTS installed for all users** — the installer from https://nodejs.org with default options. (nvm-style per-user installs won't work for her account.)
2. **Tailscale** installed and signed in on this PC.
3. **Move the project out of your user folder.** Close Studio/VS Code first, then move the inner `kettek-explainer` folder (the one with `package.json`) to `C:\KetTekVideo`. Your Desktop is private to your account, so she can't reach it there.
   - Working with Claude in the desktop app? Re-add the folder from its new place.

## Run the setup (once, ~5 min)
Start **Windows PowerShell as administrator**, then:
```powershell
cd C:\KetTekVideo
powershell -ExecutionPolicy Bypass -File .\server\setup-windows.ps1
```
It asks two things: a password for her `video` account, and whether to stop the PC from sleeping (say yes). At the end it prints her connect command with this PC's Tailscale address.

## Finish (once)
1. **Tailscale tray icon → Preferences → Run unattended.** Without it, Tailscale disconnects when you log out or after a restart.
2. **Share this PC with her:** https://login.tailscale.com/admin/machines → this PC → `…` → **Share** → her e-mail. She needs a free Tailscale account and accepts the invite; she sees only this PC.
3. Send her `server/KULLANIM.md`, the address the script printed, and the password.

## Working from another PC yourself
Use your own restricted account, so Claude can only touch the video folder — not the rest of your PC.

1. Once, in an admin PowerShell on this PC:
   ```powershell
   cd C:\KetTekVideo
   powershell -ExecutionPolicy Bypass -File .\server\setup-windows.ps1 -AddEditor kettek
   ```
2. On the other PC: install Tailscale and sign in with **your** Tailscale account (no share needed — it's your tailnet). Add to `~/.ssh/config` (Windows: `C:\Users\YOU\.ssh\config`):
   ```
   Host kettek-pc
     HostName <this PC's Tailscale address>
     User kettek
     LocalForward 3000 localhost:3000
     LocalForward 3001 localhost:3001
   ```
3. Every time: `ssh kettek-pc` → `claude` (first time: sign in with **your** Claude account) → talk.
   Keep http://localhost:3000 (preview) and http://localhost:3001 (finished videos) open in that PC's browser.

Why this is safe: `kettek` is a standard Windows account. Windows itself only lets it into `C:\KetTekVideo` — every edit and every command Claude runs is held to that, not just a Claude setting. Your Claude login is stored in that account's profile, which the `video` account can't read.
One exception: other drives (D:, E:) often let every account read and write by default. If you keep files there, check their Security tab.

## Day to day
- The PC must be **on and awake** for her to work. Windows Update restarts are fine: everything comes back at boot.
- **Don't run `npm run studio` yourself** — the studio is already running. Just open http://localhost:3000.
- **One editor at a time.** You, she, and Claude all edit the same folder. If you both change the same video at once, the last save wins.
- Preview stuck? Create an empty file `out\restart-studio` (or ask Claude: "önizlemeyi yeniden başlat"). It restarts within seconds. Log: `out\server.log`.
- Renders run at lower priority, so your PC stays usable, but a final render still keeps the CPU busy for a few minutes.
- Change her password: run the setup script again.

## What she can and can't do
- Can: edit this project, run voices/renders, read `.env` (your ElevenLabs key is in it).
- Can't: open your user folder, use admin rights, reach SSH from outside Tailscale, reach port 3000 from the network (blocked; only her SSH tunnel gets through). The downloads page :3001 is open to Tailscale devices only, so client PCs on the tailnet can open `http://<this PC's Tailscale IP>:3001` directly.
- She signs in to Claude Code with **her own** Claude account (Pro or Max).

## Undo everything
Admin PowerShell:
```powershell
Unregister-ScheduledTask -TaskName "KetTek Studio" -Confirm:$false
Remove-NetFirewallRule -DisplayName "KetTek Studio - block network access"
Stop-Service sshd; Set-Service sshd -StartupType Disabled
Remove-LocalUser -Name video
Remove-LocalUser -Name kettek          # if you added it
Remove-LocalGroup -Name "KetTek Editors"
```
Then delete the `# >>> kettek video >>>` block from `C:\Windows\System32\WindowsPowerShell\v1.0\profile.ps1`.

## Troubleshooting
- **OpenSSH install fails:** Settings → System → Optional features → add "OpenSSH Server", then run the script again.
- **Studio doesn't start, task result `0x80070569`:** give `video` the "Log on as a batch job" right (secpol.msc → Local Policies → User Rights Assignment) and run the script again.
- **She gets "Connection timed out":** PC asleep/off, Tailscale not running unattended, or the share wasn't accepted.
