# KetTek Explainer

Faceless Turkish explainer videos (9:16) from a storyboard file. Code-drawn motion graphics in Remotion, Turkish voice from ElevenLabs (or Google Chirp 3 HD), auto-placed sound effects, word-highlighted captions, frame review before render.

Built to be driven by Claude Code: the skill in `.claude/skills/kettek-explainer/` walks Claude from one topic sentence to a finished MP4.

## Setup (Mac or Windows)

1. Node.js 22+ and Claude Code installed.
2. In this folder:
   ```bash
   npm install
   cp .env.example .env      # Windows: copy .env.example .env
   ```
3. Fill `.env`:
   - `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` — pick a Turkish voice in the ElevenLabs Voice Library and copy its id.
   - Optional: `GOOGLE_TTS_API_KEY` (cheaper fallback voice), `GEMINI_API_KEY` (AI-drawn image scenes).
4. One-time sound pack: `npm run sfx` (or drop your own mp3s into `public/sfx/`, see names in `pipeline/sfx.ts`).
5. Try it with no API cost:
   ```bash
   npm run make -- qr-kod --mock
   npm run studio
   ```
   The first render downloads a headless Chrome automatically (~100 MB).

## Two formats

- **explainer** (default): bold kinetic text, icons, charts, mascot. Sample: `qr-kod`.
- **dossier**: editorial case-file look for legal explainers — brand header, chapter progress dots, serif headline with an italic accent word, legal source line, flat character illustrations that appear on spoken words, boxed captions. Sample: `kiraci-tahliye` (Law Trust, placeholder palette `lawtrust`).

**HyperFrames scenes** (either format): richer HTML/GSAP animations — case folder with a stamp, law article with a highlighted phrase, step timeline — rendered by [HyperFrames](https://github.com/heygen-com/hyperframes) as transparent clips at each scene's exact length and synced to spoken words. Sample: `hf-demo`. Library and how to make new ones: `hyperframes/README.md`.

```bash
npm run make -- kiraci-tahliye --mock
```

## Making a video with Claude Code

Open Claude Code in this folder and say, e.g.:

> Yeni video: "Simitçi bir günde ne kadar kazanır?" — 45 saniye, kettek-dark.

Claude follows the skill: researches, writes `notes.md` with sources, writes the storyboard, voices it, reviews every scene as a still, fixes issues, renders.

## Commands

| Command | What it does |
|---|---|
| `npm run make -- <slug>` | voice (if narration changed) → images → timeline → HyperFrames clips → review stills |
| `npm run make -- <slug> --mock` | same, with silent placeholder voice |
| `npm run voice -- <slug> [--force]` | narration audio + word timings |
| `npm run images -- <slug>` | generate missing `image` scenes with Gemini |
| `npm run render -- <slug> --gpu` | same, using the GPU: GPU drawing in Chrome + hardware encoding on a Mac or with an NVIDIA GPU (falls back to software automatically) |
| `npm run frames -- <slug> [--force]` | render changed `hyperframe` scenes (cached) |
| `npm run hf -- <command>` | HyperFrames CLI with this project's setup, e.g. `preview hyperframes/case-file`, `check hyperframes/case-file` |
| `npm run timeline -- <slug>` | rebuild timing/SFX after visual-only edits |
| `npm run review -- <slug> [scene-id…]` | stills to `out/review/<slug>/` |
| `npm run render -- <slug> [--draft\|--4k]` | MP4 to `out/` |
| `npm run studio` | live preview/editor in the browser |
| `npm run sfx` | generate the SFX pack with ElevenLabs |

## Layout

```
public/projects/<slug>/storyboard.json   ← the only file you (or Claude) write per video
public/projects/<slug>/notes.md          ← facts + sources
public/projects/<slug>/voice*.mp3, voice.json, timeline.json, img/   ← generated
src/scenes/      one React component per visual type
src/styles.ts    looks (colors, radius, mascot colors, image prompt style)
src/timing.ts    when elements pop in + which sound goes where
pipeline/        node scripts behind the npm commands
```

## Voices

- **ElevenLabs** (default): one take for the whole script with character-level timestamps, so captions and scene cuts land exactly on the words. `eleven_multilingual_v2` is the stable choice; `eleven_v3` is more expressive but in alpha — regenerate if a take sounds off.
- **Google Chirp 3 HD** (`"provider": "google"`): voiced scene by scene; caption timing is estimated from text length. Good enough, noticeably cheaper.
- **mock**: silent audio sized like real speech, for iterating on visuals for free.

## Notes

- Fonts are bundled (Inter, Fraunces, IBM Plex Mono — all SIL OFL, licenses in `public/fonts/`), so renders don't need internet for fonts.
- Use a custom Chrome: set `REMOTION_BROWSER=/path/to/chrome` before any command.
- Contact sheet in the review step needs a full `ffmpeg` on PATH; without it you still get one still per scene.
- Check the commercial terms of your ElevenLabs/Google/Gemini plans before publishing for clients.
