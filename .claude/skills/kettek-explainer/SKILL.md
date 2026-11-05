---
name: kettek-explainer
description: Make a Turkish vertical explainer video (Reels/TikTok/Shorts) for KetTek from one topic sentence — research, script, storyboard JSON, voice, review stills, render. Use whenever the user asks for an explainer video, a reel, or a new video in this project.
---

# KetTek Explainer — workflow

You are the scriptwriter, motion designer and editor. The user gives a topic; you deliver an MP4.
Everything lives in this repo: React scenes in `src/`, pipeline scripts in `pipeline/`, one folder per video in `public/projects/<slug>/`.

Work through these steps in order. Do not skip the review step.

## 1. Brief (ask only if missing)
- Topic and the single question the video answers.
- Target length: default 35–50 s.
- Style: `kettek-dark` (default) or `paper`. Law & Trust videos: `lawtrust` (ivory paper, navy + gold — the house look, use it unless asked otherwise) or `lawtrust-dark` (near-black, glass cards, gold dust; renders ~3x slower).
If the user gave a clear topic, don't ask — decide and say what you decided.

## 2. Research and verify
- Search the web for every fact, number and date you will say. Use primary sources where possible.
- Save `public/projects/<slug>/notes.md` with each claim and its source URL. Never put an unverified number on screen.
- No real people's likeness, no copyrighted characters, no brand logos. Brand names in narration are fine for editorial explainers.

## 3. Script (Turkish)
Write natural spoken Turkish, the way a smart friend explains something — not a news anchor.
- **Hook in the first sentence**: a surprising claim or question, under ~2 seconds. No "Merhaba", no channel intro.
- One idea per scene, 1–2 short sentences per scene. 6–10 scenes total.
- Budget: Turkish TTS runs about 14 characters per second. 45 s ≈ 600 characters of `say` text in total.
- **Write numbers as words in `say`**: "bin dokuz yüz doksan dört", "yüzde otuz". Digits go only in the visual.
- Abbreviations: if the voice mispronounces one (e.g. "QR"), spell it phonetically in `say` ("kü ar") and keep the real form on screen.
- No parentheses, slashes or emoji in `say`. Use commas for breath pauses, a question mark for rising tone.
- End with a soft CTA tied to the topic ("…için takip et").

## 4. Storyboard
Create `public/projects/<slug>/storyboard.json` (schema: `src/schema.ts`; example: `public/projects/qr-kod/`).
Rules:
- Change the visual every 2–4 seconds. Alternate types; never two of the same type in a row unless intentional.
- On-screen text is a *summary*, not the narration: max ~6 words per kinetic line, max 3 lines.
- Use `emphasis` for the one word that carries the scene.
- `bigNumber` for any single striking number (set `"grouping": false` for years).
- `mascot` for the hook-reaction, transitions ("Peki neden?") and the CTA — at most 2–3 times per video.
- `image` only when a concrete object/place must be *seen*. Give it a `prompt` describing the subject only; the style is appended automatically. Set `"useCharacter": true` to put the brand character in the scene (needs `public/brand/character.png`).

Visual types:
```json
{ "type": "kinetic", "lines": ["Üçte birini sil", "yine okunur"], "emphasis": ["okunur"] }
{ "type": "bigNumber", "value": 1994, "grouping": false, "label": "Japonya · Denso Wave" }
{ "type": "bigNumber", "value": 12.5, "decimals": 1, "prefix": "₺", "label": "bir simidin maliyeti" }
{ "type": "icons", "title": "optional", "items": [{ "icon": "Factory", "label": "Fabrika" }] }
{ "type": "mascot", "bubble": "Peki ama neden?", "mood": "curious" }
{ "type": "image", "prompt": "a cargo ship at sunset", "caption": "optional", "motion": "zoomIn" }
{ "type": "compare", "left": { "title": "A", "items": ["…"] }, "right": { "title": "B", "items": ["…"] } }
{ "type": "steps", "title": "optional", "steps": ["…", "…", "…"] }
{ "type": "bars", "title": "…", "unit": "TL", "bars": [{ "label": "…", "value": 7 }], "highlight": 1 }
```
`icon` is any Lucide icon name in PascalCase (lucide.dev/icons). Unknown names render a "?" — check the review.
Moods: `happy`, `curious`, `shocked`. Image motions: `zoomIn`, `zoomOut`, `panLeft`, `panRight`.
Per-scene `"sfx": "ding"` overrides the default sound; `"sfx": "none"` mutes the scene.

## 4b. Dossier format (law firm case files)
Use when the storyboard has `"format": "dossier"` (example: `public/projects/kiraci-tahliye/`). The layout is fixed — brand header, chapter progress dots, kicker, serif headline, illustration stage, source line, boxed captions — so you only write content.

**Story structure (6–8 chapters, 45–60 s):**
1. Hook — a concrete everyday situation, posed as a question ("Ev sahibi 'oğlum evlenecek' dedi. Çıkmak zorunda mısın?").
2. İlk tepki — what most people assume.
3. Kural — the rule, with the article number in `source`.
4. İspat / Süreç — what actually has to happen.
5. Sonuç — a `verdict` scene: the naive answer struck through, the real one lands.
6. Kör nokta — the surprising consequence most people don't know.
7. Söz sende — a neutral question for the comments + scales (`wobble`).
Consecutive scenes with the same `chapter` share a progress dot; repeat the same `headline` to keep it on screen while the illustration changes.

**Per scene:** `chapter` (kicker; "Konu · Alt konu" renders the second part in accent), `headline` (≤ 6 words, wrap ONE word in `*…*` for the italic accent), `source` (law + article, e.g. "TBK m.350"), `say`, `visual`.

**Stage scenes** — compose the picture from parts on a 940×720 canvas. Every element appears on its `cue` word in this scene's `say` (prefix match; `"kurşun#2"` = second occurrence). Unresolved cues are reported by `npm run timeline`.
- People/props/icons stand ON (x, y) — use one `ground` y for everyone in a row (typ. 640–680). Stamps, cards, tags, bubbles, badges, text are CENTERED on (x, y). Panels use top-left x, y + w, h.
- Person: `color` cast1/cast2/cast3/muted, `pose` stand · aimLeft · aimRight · sign (with `sign` text) · raise · lying (outline figure), `mood` neutral · worried · shocked · sad · happy, `look` left/right/front, `scale` (0.6 for a child).
  Make people tell apart at a glance: `hair` short · long · bun · curly · bald · headscarf, `outfit` plain · suit · dress · robe (lawyer/judge), `accessories` [veil, glasses, mustache, beard], `hairColor`. A woman, an older man, a judge, a bride and groom must not all be the same default figure.
- Props: `scales` (tilt -1…1, left/right labels, wobble), `table` (w), `bullet` (label), `stamp` (text, rotate), `card` (label, value, strike, dim), `tag`, `bubble` (text or Lucide `icon`, variant speech/thought, tail), `badge` (? x check !), `panel` (ruler), `line` (from/to, dashed), `icon` (Lucide name), `text`.
- `art` — custom artwork from `public/art/<name>.svg`: `{ "kind": "art", "name": "gold-coin", "x": 470, "y": 600, "w": 140, "cue": "altın", "idle": "bob" }` (`anchor` base/center, `flip`, `rotate`, `color`, `idle` bob · sway · spin · pulse). Library and drawing rules: `public/art/README.md`.
- Keep 2–5 elements per scene, max ~3 people. Leave the top ~120 px of the canvas for stamps/bubbles. Characters face each other when they interact.
- Depict incidents abstractly: no blood, no injuries, no realistic weapons beyond the flat diagram style, no real people, courts, logos or identifiable case parties.

## 4b+. Missing visuals — make them, don't settle
Before writing the storyboard, list what each scene must SHOW (who, what object, what place). For each item:
1. Kit first: a person option (hair/outfit/accessories), a prop, a Lucide icon.
2. Not good enough (wrong gender/role/age, a culturally specific object like a wedding sash, tapu, ikametgah, çeyrek altın)? Check `public/art/` and reuse.
3. Still missing → draw it yourself as `public/art/<name>.svg` following `public/art/README.md` (palette variables only, flat, ink outlines, no text), add it to the library table there, and use it with `"kind": "art"`.
4. A missing body/costume/pose type for people → extend `src/stage/Person.tsx` (new `hair`/`outfit`/`accessories` value + the enum in `src/schema.ts`) rather than faking it.
5. A whole new animated moment (chat thread, countdown, document being filled) → a new HyperFrames composition (4c).
Review every new piece in the stills; fix proportions/overlaps before moving on. Never leave a red "art yok" box in a video — `npm run timeline` warns about missing art.

## 4b++. Modern scene types — pick the engine by what the scene shows
Each moment gets the engine that draws it best (idea from the "kalem" skill). They work in every style, light or dark. All four draw on the same 940×720 canvas as `stage`, and their beats land on `cue` words of the scene's `say` (or `at` seconds).

| The scene shows… | Type |
|---|---|
| a drawing that draws itself: an icon, an arrow to something, a ring around it, a crossed-out idea | `sketch` |
| one real object, lit and turning: scales, gavel, house, document, courthouse, key | `object3d` |
| a single striking number or word with energy: "3 YIL", "%25", "30 GÜN" | `particles` |
| things piling up: documents, steps, costs, obligations dropping in one by one | `physics` |

```json
{ "type": "sketch", "strokes": [
  { "kind": "icon", "name": "Truck", "x": 300, "y": 300, "size": 240, "cue": "taşınması" },
  { "kind": "arrow", "from": [470, 330], "to": [660, 240], "bend": -0.35 },
  { "kind": "text", "x": 710, "y": 170, "text": "Hemen taşın?", "size": 58, "font": "serif" },
  { "kind": "circle", "x": 300, "y": 300, "r": 170, "color": "danger", "cue": "basit" },
  { "kind": "path", "d": "M190 190 L410 410 M410 190 L190 410", "color": "danger", "width": 8 },
  { "kind": "underline", "x": 560, "y": 210, "w": 300 } ] }
{ "type": "object3d", "model": "gavel", "label": "Önce mahkeme kararı", "orbit": 40, "cue": "karar" }
{ "type": "particles", "effect": "burst", "text": "3 yıl", "sub": "başkasına kiralayamaz", "cue": "üç" }
{ "type": "physics", "items": [ { "label": "Tahliye davası", "icon": "FileText", "cue": "davası" }, { "label": "Mahkeme", "icon": "Landmark", "cue": "mahkemede" } ] }
```
- `sketch`: strokes without a cue draw one after another; `dur` (seconds) sets one stroke's drawing time. Paths are SVG `d` strings in canvas pixels. Colors default to gold (icon/arrow/circle/underline) and white (path/text); `"color": "danger"` for a crossed-out idea. Text is centered on (x, y). Glow is on in dark styles.
- `object3d`: the `cue` is the action — gavel strikes, scales tip toward `tilt` (-1…1), house lights up, document opens, courthouse pediment glows, key turns. `orbit` = degrees the camera travels (default 50). 1–2 per video; it is the "vay" moment.
- `particles`: `burst` explodes from the center on the cue, `gather` flies in and forms the text by the cue, `rise` = embers for a calm closing line. Center: `text` (≤ 10 chars reads best), `sub`, or a Lucide `icon`.
- `physics`: 1–12 cards; each drops on its cue and a thud plays on the exact frame it hits. Up to 5 stack in one pile, more go in two piles.
- Example with every type: `public/projects/kiraci-tahliye-modern/`.

**Transitions.** Set `"transition"` on the storyboard (default for all scenes) and/or on a scene (its entrance): `fade` (default), `slide`, `wipe`, `zoom`, `flip`, `blur`, `light` (a soft gold sweep over the cut), `none`. Cuts stay on the narration — the outgoing scene leaves the way the next one arrives. Vary them; use `light` for the turn of the story (the verdict, the blind spot), not on every scene.

## 4c. HyperFrames scenes (richer animation)
`{ "type": "hyperframe", "comp": "<name>", "vars": {…}, "cues": {…} }` plays an HTML/GSAP composition from `hyperframes/<name>/`, pre-rendered as a transparent clip at the scene's exact length (example: `public/projects/hf-demo/`). Full reference and how to make new ones: `hyperframes/README.md`.
- Library: `case-file` (folder, sheet with lines, highlighter, stamp), `law-article` (article number + verbatim law text with a highlighted phrase), `timeline` (numbered steps that land on cue words). Variables per comp are listed in `hyperframes/README.md` and declared at the top of each `index.html`.
- Use 1–3 per video, for the moments that carry the story (the case, the article, the process). Keep `stage`/`verdict`/`kinetic` for the rest — they cost nothing to change.
- `cues` map the composition's beats to words of this scene's `say` (`"stamp": "inceleyecek"`, or `{ "word": "…", "sfx": "thud" }` for a sound).
- Law text in `law-article` must be quoted verbatim from the source in `notes.md`.
- Each changed hyperframe scene re-renders in ~25–40 s (`npm run frames -- <slug>`; part of `make`; automatic in server mode). Until then the preview shows the previous clip or a "render ediliyor…" box — say so instead of declaring the change done.
- New composition = copy the closest folder, follow `hyperframes/README.md`, `npm run hf -- check hyperframes/<name>` must pass. Never convert the project or the whole video to HyperFrames; Remotion stays the video engine.

**Legal-content rules (Türkiye) — non-negotiable:**
- Every claim must match the statute/case text in `notes.md` with a source link. If unsure, cut the claim. Use "genellikle", "kural olarak" where exceptions exist.
- General education only: no "bizi arayın", no phone/WhatsApp, no fees, no "uzman/en iyi" claims, no client cases or results, no practice-area promotion. The CTA is a neutral question for comments.
- The last scene carries the brand disclaimer ("Bilgilendirme amaçlıdır, hukuki tavsiye değildir.") via `brand.disclaimer`; also add it to the post caption.
- No paid promotion/boosting of these posts. The TBB Reklam Yasağı Yönetmeliği (amended 9 Aug 2024) restricts lawyers' online advertising — the firm's lawyer approves every video before publishing.

## 5. Build
```bash
npm run make -- <slug>          # voice (only if narration changed) → images → timeline → HyperFrames clips → review stills
npm run make -- <slug> --mock   # silent placeholder voice, no API cost — use while iterating on visuals
```
If voice fails, show the user the error; the usual causes are a missing key in `.env` or a wrong voice id.

## 6. Review — look at every frame
Read `out/review/<slug>/contact-sheet.png` (if present) and each `NN.png`. For each scene check:
- Text fits, nothing clipped, nothing touching the captions or the top handle.
- Turkish characters render (İ ı ğ ş ç ö ü) — never ASCII substitutes.
- Numbers on screen match the narration and `notes.md`.
- Emphasis landed on the intended word; icons are not "?".
- Contrast is readable; the scene is visually different from its neighbours.
Fix the storyboard, then `npm run timeline -- <slug>` and `npm run review -- <slug> <scene-id>` for just the changed scenes (if a hyperframe scene changed, `npm run frames -- <slug>` before the review).
Visual-only edits never need a new voice. Editing any `say` text means re-voicing (make does this automatically).

## 7. Render — on GitHub
```bash
npm run bulut -- <slug> --draft   # fast 540x960 check
npm run bulut -- <slug>           # 1080x1920 final
npm run bulut -- <slug> --4k      # 2160x3840
```
Renders on GitHub (3–8 min), then the MP4 is copied to the Desktop and `out/`. Tell the user the file name on the Desktop and the length.
Local `npm run render -- <slug>` only when the user explicitly asks to render on this computer.

## 8. Hand-off
Give the user, in Turkish: a post caption (2–3 lines, ends with a question to drive comments), 5–8 hashtags, and which second makes the best cover frame.

## Extending
- New scene type: add a zod schema in `src/schema.ts`, a component in `src/scenes/`, a case in `src/scenes/index.tsx`, beats/sfx in `src/timing.ts` (+ its sounds in `pipeline/timeline.ts`). Everything must be driven by the frame number: no `Math.random` (use `src/fx/random.ts`), no CSS animations, no `useFrame` in 3D.
- New look: add an entry to `STYLES` in `src/styles.ts` (colors, cast colors, radius, image prompt, mascot colors). Dark looks set `dark: true` (glow page, glass stage, gold dust) plus `band`/`onBand` (masthead) and `skin`/`outline` (illustrated people).
- Firm logo: put it in `public/brand/` and set `brand.logo` to the file name.
- New illustration part: add it to the `El` union in `src/schema.ts`, draw it in `src/scenes/Stage.tsx` (or `src/stage/`), and give it a sound in `STAGE_SFX` (`src/timing.ts`).
- SFX: `npm run sfx` generates the pack once; or drop your own `whoosh.mp3`, `pop.mp3`, etc. into `public/sfx/`.
- Live preview: `npm run studio`, pick the Explainer composition, set props `{ "slug": "<slug>" }`.
