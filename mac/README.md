# Mac: one-click "KetTek Video" app

Double-clicking **KetTek Video** on the Desktop:
1. starts the preview service (or reuses it if it's already open),
2. opens **Önizleme** (localhost:3000) and **Videolar** (localhost:3001) in the browser,
3. opens a Terminal window with Claude ready in the project.

Closing Claude (`/exit`) or the window stops the preview service again.

## Set up (once, by Keti)
1. Install **Node.js 22 LTS** from https://nodejs.org (macOS installer).
2. Put the project in your home folder: `~/KetTekVideo` (not Desktop/Documents — iCloud may sync those).
3. In Terminal:
   ```bash
   cd ~/KetTekVideo
   bash mac/setup-mac.sh
   ```
   It installs the project, Claude Code and the Chrome used for rendering, and creates **KetTek Video** on the Desktop.
4. Double-click it once yourself:
   - macOS asks to let "KetTek Video" control Terminal → **OK**
   - Claude asks to sign in → sign in with the Claude account of the person who'll use this Mac
5. Optional: drag the app into the Dock.

Moved the project folder? Run `bash mac/setup-mac.sh` again — the app points to the folder's path.

## What Claude may do without asking
`.claude/settings.json` lets Claude edit files inside the project and run `npm run …` commands (voice, review, render) without a prompt each time. It can't read or change `.env` (the API keys). Anything else — files outside the project, other commands — still asks first.

## If something goes wrong
- **"Önizleme açılamadı":** send `~/KetTekVideo/out/server.log` to Keti.
- **App does nothing / "not allowed to send keystrokes":** System Settings → Privacy & Security → Automation → allow "KetTek Video" → Terminal.
- **Icon is generic:** harmless; run the setup again or log out and back in.
