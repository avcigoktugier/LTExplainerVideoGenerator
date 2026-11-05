// Merges storyboard + voice timings into the frame-accurate timeline the video renders from.
// Usage: npm run timeline -- <slug>
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FPS, HEIGHT, WIDTH, type Timeline, type TimelineScene, type VoiceResult } from "../src/schema";
import { cueFrame } from "../src/cues";
import { beats, DEFAULT_SFX, hyperframeCues, STAGE_SFX } from "../src/timing";
import { findHyperframeAsset, planHyperframe } from "./hf";
import { loadStoryboard, projectDir, PUBLIC, readJson, sayHash, slugArg, writeJson } from "./lib";

const TAIL = 0.7; // seconds held after the last word

const slug = slugArg();
const sb = loadStoryboard(slug);
const voiceFile = join(projectDir(slug), "voice.json");
if (!existsSync(voiceFile)) {
  console.error(`No voice yet. Run: npm run voice -- ${slug}`);
  process.exit(1);
}
const voice = readJson<VoiceResult>(voiceFile);
if (voice.sayHash !== sayHash(sb)) {
  console.error(`Narration changed since voicing. Run: npm run voice -- ${slug}`);
  process.exit(1);
}

const f = (sec: number) => Math.round(sec * FPS);
const lastWordEnd = voice.words.at(-1)?.end ?? voice.total;
const end = Math.max(voice.total, lastWordEnd) + TAIL;

const scenes = sb.scenes.map((s, i) => {
  const from = f(voice.sceneStarts[i]);
  const to = i < sb.scenes.length - 1 ? f(voice.sceneStarts[i + 1]) : f(end);
  let asset: string | undefined;
  if (s.visual.type === "image") {
    const name = s.visual.file ?? `${s.id}.png`;
    if (existsSync(join(projectDir(slug), "img", name))) asset = `projects/${slug}/img/${name}`;
    else console.log(`  ! scene ${s.id}: img/${name} not found, placeholder will show`);
  }
  return { ...s, from, durationInFrames: Math.max(15, to - from), asset } as TimelineScene;
});

// HyperFrames scenes: point at the render made for exactly this length + variables (or the last one, marked stale)
let staleHf = 0;
for (const s of scenes) {
  if (s.visual.type !== "hyperframe") continue;
  try {
    const plan = planHyperframe(sb, s, voice.words, FPS);
    const found = findHyperframeAsset(slug, plan);
    s.asset = found.asset;
    s.assetFresh = found.fresh;
    if (!found.fresh) staleHf++;
  } catch (e) {
    console.log(`  ! scene ${s.id}: ${(e as Error).message}`);
  }
}

// ---------- Sound effects ----------
const missing = new Set<string>();
const sfxFile = (name: string) => {
  if (existsSync(join(PUBLIC, "sfx", `${name}.mp3`))) return `sfx/${name}.mp3`;
  missing.add(name);
  return null;
};
const sfx: Timeline["sfx"] = [];
const taken = new Set<number>(); // one sound per frame, so many elements on one cue don't stack up
const addSfx = (name: string, from: number, volume: number) => {
  const src = sfxFile(name);
  if (!src || taken.has(from)) return;
  taken.add(from);
  sfx.push({ src, from, volume });
};
const dossier = sb.format === "dossier";
scenes.forEach((s, i) => {
  if (s.sfx === "none") return;
  const defaults = DEFAULT_SFX[s.visual.type];
  // In the dossier format a scene inside the same chapter is a continuation: no transition sound
  const sameChapter = dossier && i > 0 && scenes[i - 1].chapter === s.chapter && scenes[i - 1].headline === s.headline;
  const enterName = s.sfx ?? (sameChapter ? undefined : defaults.enter);
  if (enterName) addSfx(enterName, Math.max(0, s.from - 3), 0.32);

  const ctx = { words: voice.words, from: s.from, durationInFrames: s.durationInFrames, fps: FPS };
  const b = beats(s.visual, s.durationInFrames, ctx);
  if (s.visual.type === "stage") {
    s.visual.elements.forEach((el, k) => {
      if (el.cue && cueFrame(ctx, el.cue) === null) console.log(`  ! scene ${s.id}: cue "${el.cue}" not found in its narration`);
      if (el.kind === "art" && !existsSync(join(PUBLIC, "art", `${el.name}.svg`)))
        console.log(`  ! scene ${s.id}: art "${el.name}" missing — draw public/art/${el.name}.svg (see public/art/README.md)`);
      const name = STAGE_SFX[el.kind];
      if (name && b[k] > 2) addSfx(name, s.from + b[k], el.kind === "stamp" ? 0.4 : 0.22);
    });
  } else if (s.visual.type === "hyperframe") {
    for (const c of Object.values(hyperframeCues(s.visual, ctx))) if (c.sfx) addSfx(c.sfx, s.from + c.frame, c.sfx === "thud" ? 0.4 : 0.25);
  } else if (defaults.beat) {
    for (const x of b.slice(1)) addSfx(defaults.beat, s.from + x, 0.25);
  }
});

const timeline: Timeline = {
  slug,
  title: sb.title,
  style: sb.style,
  format: sb.format,
  brand: sb.brand,
  episode: sb.episode,
  handle: sb.handle,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  durationInFrames: f(end),
  clips: voice.clips.map((c) => ({ src: c.src, from: f(c.start) })),
  music: sb.music && existsSync(join(PUBLIC, "music", sb.music)) ? `music/${sb.music}` : undefined,
  sfx,
  words: voice.words,
  scenes,
};

writeJson(join(projectDir(slug), "timeline.json"), timeline);
writeJson(join(PUBLIC, "projects", "_current.json"), { slug }); // Studio opens this project
console.log(`✓ timeline: ${scenes.length} scenes, ${(timeline.durationInFrames / FPS).toFixed(1)}s, ${sfx.length} sfx`);
if (missing.size) console.log(`  (no file yet for sfx: ${[...missing].join(", ")} — run: npm run sfx)`);
if (sb.music && !timeline.music) console.log(`  (music file public/music/${sb.music} not found, skipped)`);
if (staleHf) console.log(`  (${staleHf} HyperFrames scene(s) need rendering — run: npm run frames -- ${slug})`);
