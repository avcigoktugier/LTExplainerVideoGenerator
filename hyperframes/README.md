# HyperFrames compositions

Richer animated scenes for the Remotion videos. Each folder here is one **composition**: an HTML page animated with GSAP that [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0, by HeyGen) renders to a transparent WebM. A storyboard scene uses one like this:

```json
{ "type": "hyperframe", "comp": "case-file",
  "vars": { "lines": ["…", "…"], "stamp": "İNCELEMEDE" },
  "cues": { "stamp": { "word": "inceleyecek", "sfx": "thud" } } }
```

`npm run frames -- <slug>` (also part of `npm run make`, and automatic in server mode) renders each such scene **at its exact length and box size**, then the video plays it in the scene area. Renders are cached: only scenes whose composition, variables, cue times or length changed are re-rendered (~25–40 s each).

HyperFrames is used **only** for these scene clips. The video itself — narration, captions, layout, timing, final MP4 — stays in Remotion. Don't convert the project to HyperFrames.

## Library

| comp | what it shows | variables | cues |
|---|---|---|---|
| `case-file` | Case folder swings up, a sheet slides out, lines write in, a highlighter marks one line, a stamp slams down | `title` (folder tab), `label`, `lines` (list, max 4), `highlightLine` (1–4, 0 = none), `stamp` ("" = none) | `highlight`, `stamp` |
| `law-article` | Article number rolls in, the law text appears word by word, a highlighter sweeps the key phrase | `code` ("TBK"), `article` ("m. 355/1"), `text` (the article text, verbatim), `highlight` (exact words from `text`), `note` (optional footer) | `highlight` |
| `timeline` | Numbered steps on a line that fills as each step lands; the last (or `active`) step lights up | `events` (list, max 5: `{ "when": "…", "what": "…" }` or plain text), `active` (1–5, 0 = none) | `e1` … `e5` |

Every composition also receives, automatically: the style's palette (`ink`, `paper`, `surface`, `accent`, `accent2`, `muted`, `danger`, `cast1-3`) and `duration` (scene length in seconds).

**Cues**: `"cues": { "<name>": "<word>" }` — the word from this scene's `say` (prefix match; `"dava#2"` = 2nd occurrence) at which that animation beat happens. Add `"sfx": "thud"` (object form) for a sound on the beat. A cue word that isn't in the narration falls back to the composition's own timing (`npm run frames` warns).

**Sizes**: rendered at the scene box — 940×720 (dossier) or 940×1200 (explainer). `"area": "full"` renders 1080×1920 over the whole frame (keep the header and caption zones clear).

## Making a new composition

1. Copy the closest one: `cp -r hyperframes/timeline hyperframes/<new-name>` (lowercase, dashes).
2. Edit `index.html`. Preview live while editing: `npm run hf -- preview hyperframes/<new-name>` → http://localhost:3002
3. Check it: `npm run hf -- check hyperframes/<new-name>` — fix every ✗ (ignore `first_frame_empty` and `line_unread`: these clips are scenes inside a longer video).
4. Use it in a storyboard and run `npm run frames -- <slug>`; look at the review stills.

### Rules (HyperFrames renders by seeking a paused timeline frame by frame)
- Root element: `<div id="root" data-composition-id="<name>" data-start="0" data-duration="6" data-width="940" data-height="720">`. The pipeline rewrites duration/width/height per scene.
- One GSAP timeline, created `{ paused: true }`, registered last: `window.__timelines["<name>"] = tl;`.
- Deterministic only: no `Math.random()`, `Date.now()`, timers, network, `repeat: -1`. Everything visible is a function of timeline time.
- Animate transforms/opacity/clip-path with GSAP; never put a CSS `transform` on an element GSAP also transforms. GSAP 3 has no `className` tweens.
- A `fromTo` that starts late on an element already animated earlier needs `immediateRender: false`, or its start values leak into frame 0.
- Assets: `assets/kettek.css` (fonts KetSerif/KetSans/KetMono with Turkish glyphs, palette CSS variables), `assets/gsap.min.js` in `<head>`; `assets/kettek.js` at the start of `<body>`'s script section. Own images go in the composition's `assets/` folder too. No CDN links.
- Variables: declare every one on `<html data-composition-variables='[...]'>` with `id`, `type`, `label`, `default`. Types: `string`, `number`, `color`, `boolean`, `enum`, `font`, `image` — **no list type**: declare lists as `string` and read them with `KT.list("name")` (the pipeline sends storyboard arrays as JSON text).
- Declare `cue_<name>` (number, a sensible default) for each cue, and read it with `KT.cue("<name>", fallback)` — it's clamped to finish before the end.
- Design at a fixed size and wrap it: `KT.fit("#fit", 860, 720)` scales it into whatever box it's rendered at. Keep text ≥ 22 px at design size and labels at ≥ 4.5:1 contrast (`color-mix(in srgb, var(--ink) 70%, var(--surface))` for small grey text).
- Background stays transparent — the video's own layout shows through.

`KT` helper (`_shared/kettek.js`): `KT.vars` (all variables), `KT.dur` (scene length), `KT.cue(name, fallback)`, `KT.list(name)`, `KT.text(selector, name)`, `KT.fit(selector, w, h)`.
`npm run hf -- docs gsap` / `docs compositions` / `docs data-attributes` show HyperFrames' own docs.
