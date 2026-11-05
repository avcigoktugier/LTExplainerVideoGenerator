# Mac: one-click "LT Video" app

Double-clicking **LT Video** on the Desktop:
1. fetches the latest project changes, starts the preview service (or reuses it if it's already open),
2. opens **Önizleme** (localhost:3000) and **Videolar** (localhost:3001) in the browser,
3. opens a Terminal window with Claude ready in the project.

Videos are **rendered on GitHub**, not on the Mac: Claude runs `npm run bulut -- <slug>` and the MP4 lands on the Desktop.
The person using the Mac never touches GitHub; the `GITHUB_TOKEN` in `.env` does it for them.

Closing Claude (`/exit`) or the window stops the preview service again.

## Set up (once)
Paste this one line into Terminal (Applications → Utilities → Terminal):
```bash
curl -fsSL https://raw.githubusercontent.com/avcigoktugier/LTExplainerVideoGenerator/master/mac/install.sh | bash
```
It may first ask for Apple's developer tools or Node.js 22 — install them, then paste the line again.
It downloads the project to `~/LTVideo`, installs everything, asks for three keys (ElevenLabs key, ElevenLabs voice id,
GitHub token — typed hidden) and creates **LT Video** on the Desktop. Then double-click it once:
- macOS asks to let "LT Video" control Terminal → **OK**
- Claude asks to sign in → sign in with the Claude account of the person who'll use this Mac

Optional: drag the app into the Dock.

Moved the project folder? Run `bash mac/setup-mac.sh` again — the app points to the folder's path.

## What Claude may do without asking
`.claude/settings.json` lets Claude edit files inside the project and run `npm run …` commands (voice, review, render) without a prompt each time. It can't read or change `.env` (the API keys). Anything else — files outside the project, other commands — still asks first.

## If something goes wrong
- **"Önizleme açılamadı":** send `~/LTVideo/out/server.log` to whoever set it up.
- **App does nothing / "not allowed to send keystrokes":** System Settings → Privacy & Security → Automation → allow "KetTek Video" → Terminal.
- **Icon is generic:** harmless; run the setup again or log out and back in.
