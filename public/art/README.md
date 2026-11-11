# Custom artwork (`"kind": "art"`)

When a scene needs something the kit can't show (a person option, a Lucide icon, a prop),
draw it here as `<name>.svg` and use it in a stage scene:

```json
{ "kind": "art", "name": "gold-coin", "x": 470, "y": 600, "w": 140, "cue": "altın", "idle": "bob" }
```

Fields: `w` (px; height follows the viewBox), `color` (fills `var(--main)`), `flip`, `rotate`,
`anchor` (`base` = stands on x,y — default; `center`), `idle` (`bob` · `sway` · `spin` · `pulse`),
plus the usual `cue` / `at` / `enter`. A missing file shows a red "art yok" box and `npm run timeline` warns.

## Drawing rules (keeps every video in one style)
- Plain SVG with a `viewBox`, no width/height needed. Draw in a box about the size it appears (100–400 px).
- **Colors only through variables**, never hex: `var(--ink)` outlines/dark, `var(--paper)` light fills,
  `var(--accent)` brass, `var(--danger)` red, `var(--muted)`, `var(--cast1|2|3)`, `var(--main)` (the element's `color`, default accent).
  The art then follows the brand palette and any future palette change.
- Flat shapes, ink outlines `stroke-width` 4–5, `stroke-linejoin="round"`, a soft ground shadow
  (`<ellipse … fill="var(--ink)" opacity=".12"/>`) for objects that stand on the ground.
- No text, letters, logos, real people, flags or national/religious symbols. No `<script>`, no external links or images.
- Name in English kebab-case (`gold-coin`, `wedding-sash`). Reuse before drawing: check this folder first.
- Check it in `npm run review -- <slug> <scene>` like any other scene.

## Library
| name | what |
|---|---|
| gold-coin | gold coin (çeyrek altın) |
| bracelet | gold bangle bracelet (bilezik) |
| wedding-sash | red wedding ribbon with gold coins pinned on it |
| title-deed | property title deed (tapu) with a house emblem and seal |
