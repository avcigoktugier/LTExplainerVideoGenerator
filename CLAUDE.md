# KetTek video pipeline — notes for Claude

Remotion project that turns `public/projects/<slug>/storyboard.json` into vertical Turkish explainer videos.
For any video work, follow the `kettek-explainer` skill in `.claude/skills/`.

## Rendering: always on GitHub
This computer is too weak to render. Final videos are rendered on GitHub:
`npm run bulut -- <slug>` (add `--draft` for a quick check). It commits and pushes the project, renders it on GitHub
(about 3–8 minutes — tell the person so and wait; don't start another render meanwhile) and puts the MP4 on the
**Desktop**; tell them its file name when it's done. Never run `npm run render` here unless the person explicitly asks
for a render on this computer. Voice first: `bulut` refuses a project whose narration isn't voiced yet.
If `bulut` fails, show the person its Turkish message; for a failed render, read the log the message links to
(`gh` is not installed here — open nothing, just report the link).

## Which mode am I in?
**Ports:** this copy's preview and exports ports are 3000/3001 unless a `ports.json` in the project root sets others (e.g. a second copy on 3010/3011). `npm run ports` prints them. Below, "the preview port" / "the exports port" mean these — never assume 3000 if `ports.json` exists, or you'll be looking at the other copy.

Check once per session whether the preview service is up: open http://localhost:<preview port> (e.g. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`, or `Invoke-WebRequest` in PowerShell).
- **It answers** → server mode (rules below).
- **It doesn't** → personal workstation (e.g. the owner's Mac). Ask the person to run `npm run server` in a separate terminal window and keep it open — that gives the preview and the finished videos on this copy's ports (`npm run ports`). Don't start it inside your own shell (it never exits). Everything else below still applies, except the restart/log notes.

## Server mode (someone connected over SSH)
The person you're talking to is often not a developer. They edit by talking to you in Turkish and look at the result in their browser. This may be a Linux server or the owner's personal Windows PC (shell: PowerShell).

- **Stay inside this project folder.** Never read, change or list files outside it — on the Windows PC it's the owner's personal machine.
- A background service is ALWAYS running: Remotion Studio on the preview port (http://localhost:3000 by default), the exports/download page on the exports port (http://localhost:3001 by default). Never start `npm run studio` or `npm run server` yourself — the ports are taken.
- After you save a `storyboard.json`, the service rebuilds that project's timeline within ~2 s. You don't need to run `npm run timeline`. Tell the person: "Önizleme sekmesini yenileyin" (refresh the preview tab).
- HyperFrames scenes (`"type": "hyperframe"`): after a storyboard save the service also re-renders the changed ones in the background (~25–40 s each; `out/server.log` shows "HyperFrames ready"). Don't run `npm run frames` yourself in server mode — tell the person to wait about half a minute, then refresh. On a workstation without the service, run `npm run frames -- <slug>` yourself.
- If you changed any `say` text, the voice must be regenerated: `npm run voice -- <slug>`. This costs ElevenLabs credits — batch narration edits and confirm before re-voicing more than once. While iterating on visuals only, never re-voice.
- Exports: `npm run bulut -- <slug>` (see "Rendering: always on GitHub"): the MP4 lands on the Desktop and in `out/`, so it also shows on the exports page (http://localhost:<exports port>). Don't press Render inside Studio — that renders on this computer.
- Check your own work with `npm run review -- <slug> [scene-id]` and read the PNGs in `out/review/<slug>/` before saying a change is done.
- Preview stuck or not loading: create an empty file `out/restart-studio` (PowerShell: `New-Item out/restart-studio -Force`; bash: `touch out/restart-studio`). The service restarts Studio within a few seconds. Logs: `out/server.log` on Windows, `sudo journalctl -u kettek-studio -n 50` on Linux.
- The machine is shared and not powerful. Render one video at a time; don't run review and render in parallel.
- Reply in Turkish unless the person writes in another language. Keep replies short: what changed, and what to do next (usually "Önizleme sekmesini yenileyin").
