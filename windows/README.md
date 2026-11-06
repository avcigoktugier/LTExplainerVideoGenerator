# Windows: one-click "LT Video" shortcut

Double-clicking **LT Video** on the Desktop:
1. fetches the latest project changes, starts the preview service (or reuses it if it's already open),
2. opens **Önizleme** (localhost:3000) and **Videolar** (localhost:3001) in the browser,
3. opens a PowerShell window with Claude ready in the project.

Videos are **rendered on GitHub**, not on the PC: Claude runs `npm run bulut -- <slug>` and the MP4 lands on the Desktop.
The person using the PC never touches GitHub; the `GITHUB_TOKEN` in `.env` does it for them.

Typing `/exit` in Claude stops the preview service again. Closing the window with X leaves it running; the next
double-click reuses it.

(This is for using the studio on your own PC. To let others work on *your* PC over SSH, see `server/README-windows.md`.)

## Set up (once)
Open **PowerShell** (Start → type "PowerShell" → Enter; no admin needed) and paste this one line:
```powershell
irm https://raw.githubusercontent.com/avcigoktugier/LTExplainerVideoGenerator/master/windows/install.ps1 | iex
```
- Git and Node.js are installed automatically with winget if they're missing (Windows may ask "Evet" for each).
  On a PC without winget it opens their download pages instead — install, open a **new** PowerShell, paste the line again.
- It downloads the project to `C:\Users\<name>\LTVideo`, installs everything, asks for three keys (ElevenLabs key,
  ElevenLabs voice id, GitHub token — typed hidden), installs Claude Code and puts **LT Video** on the Desktop.
- Then double-click it once: Claude asks to sign in → sign in with the Claude account of the person who'll use this PC.

Safe to paste again at any time (updates the project, asks only for keys still missing).
Moved the project folder? Run `powershell -ExecutionPolicy Bypass -File .\windows\setup.ps1` in it — the shortcut points to the folder's path.

## If something goes wrong
- **"Önizleme açılamadı":** send `%USERPROFILE%\LTVideo\out\server.log` to whoever set it up.
- **403 while installing Claude Code:** usually a VPN or a blocked network; turn the VPN off and paste the line again.
- **Shortcut opens and closes at once:** run `powershell -ExecutionPolicy Bypass -File "$HOME\LTVideo\windows\session.ps1"` in PowerShell to see the message.

## Encoding note (for editing these files)
`install.ps1` is saved as UTF-8 **without** a BOM (it runs through `iex`, which fails on a leading BOM).
`setup.ps1` and `session.ps1` are UTF-8 **with** a BOM (Windows PowerShell 5.1 reads BOM-less files as ANSI and garbles Turkish).
