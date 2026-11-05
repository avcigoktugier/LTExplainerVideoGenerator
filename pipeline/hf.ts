// HyperFrames integration: shared by frames.ts (renders) and timeline.ts (finds the current render).
// A "hyperframe" scene = an HTML/GSAP composition in hyperframes/<comp>/, rendered to a transparent
// WebM at the scene's exact size and length. Variables come from the storyboard, the style's palette,
// and the narration (cue_* = seconds into the scene when a cue word is spoken).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { cueFrame } from "../src/cues";
import { FULL_BOX, sceneBox, type Box } from "../src/layout";
import type { Storyboard, TimelineScene, Word } from "../src/schema";
import { getStyle } from "../src/styles";
import { projectDir, ROOT } from "./lib";

export const HF_DIR = join(ROOT, "hyperframes");
export const HF_SHARED = join(HF_DIR, "_shared");
export const HF_VERSION = "0.9.8"; // keep in step with package.json; part of the cache key

type HfVisual = Extract<TimelineScene["visual"], { type: "hyperframe" }>;
export type HfDecl = { id: string; type: string; label?: string; default?: unknown };

export const safeId = (id: string) => id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

// Every file under a folder, sorted, as [relative path, contents] — for hashing and copying
// Copies of shared files that `npm run hf` puts into a composition's assets/ — not part of its identity
const GENERATED = new Set(["kettek.css", "kettek.js", "gsap.min.js", "fonts"]);

export const listFiles = (dir: string, skipGenerated = false): string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      if (name.startsWith(".") || name === "renders" || name === "node_modules") continue;
      if (skipGenerated && d === join(dir, "assets") && GENERATED.has(name)) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out;
};

// The variables a composition declares on <html data-composition-variables='[...]'>
export const readDeclarations = (html: string): HfDecl[] => {
  const m = html.match(/<html\b[^>]*\bdata-composition-variables\s*=\s*(['"])([\s\S]*?)\1/i);
  if (!m) return [];
  const raw = m[2].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("data-composition-variables is not valid JSON");
  }
};

export const paletteVars = (styleName: string): Record<string, string> => {
  const s = getStyle(styleName);
  return {
    ink: s.ink,
    paper: s.bg,
    surface: s.bg2,
    accent: s.accent,
    accent2: s.accent2,
    muted: s.muted,
    danger: s.danger,
    cast1: s.cast[0],
    cast2: s.cast[1],
    cast3: s.cast[2],
  };
};

export type HfPlan = {
  sceneId: string;
  comp: string;
  compDir: string;
  box: Box;
  frames: number;
  seconds: number;
  vars: Record<string, unknown>; // only declared keys
  unknownVars: string[]; // storyboard vars the composition doesn't declare (typos)
  missingCues: string[]; // cue words not found in the narration
  hash: string;
  outRel: string; // relative to public/
  outAbs: string;
  prefix: string; // file prefix for this scene's renders (old ones are cleaned up)
};

export const planHyperframe = (
  sb: Storyboard,
  scene: TimelineScene,
  words: Word[],
  fps: number,
): HfPlan => {
  const v = scene.visual as HfVisual;
  const compDir = join(HF_DIR, v.comp);
  const index = join(compDir, "index.html");
  if (!existsSync(index)) throw new Error(`scene ${scene.id}: composition "${v.comp}" not found (expected ${relative(ROOT, index)})`);
  const html = readFileSync(index, "utf8");
  const decls = readDeclarations(html);
  const declared = new Set(decls.map((d) => d.id));

  const box = v.area === "full" ? FULL_BOX : sceneBox(sb.format);
  const seconds = Math.round((scene.durationInFrames / fps) * 1000) / 1000;

  // Cue words → seconds into the scene
  const ctx = { words, from: scene.from, durationInFrames: scene.durationInFrames, fps };
  const cueVars: Record<string, number> = {};
  const missingCues: string[] = [];
  for (const [name, c] of Object.entries(v.cues ?? {})) {
    const word = typeof c === "string" ? c : c.word;
    const f = cueFrame(ctx, word);
    if (f === null) missingCues.push(`${name} ("${word}")`);
    else cueVars[`cue_${name}`] = Math.round((f / fps) * 1000) / 1000;
  }

  const all: Record<string, unknown> = { ...paletteVars(sb.style), duration: seconds, ...(v.vars ?? {}), ...cueVars };
  // HyperFrames variables have no list type: lists/objects travel as JSON text in a "string" variable (KT.list reads them back)
  const declType = new Map(decls.map((d) => [d.id, d.type]));
  const vars = Object.fromEntries(
    Object.entries(all)
      .filter(([k]) => declared.has(k))
      .map(([k, val]) => [k, declType.get(k) === "string" && val !== null && typeof val === "object" ? JSON.stringify(val) : val]),
  );
  const unknownVars = [...Object.keys(v.vars ?? {}), ...Object.keys(cueVars)].filter((k) => !declared.has(k));

  const h = createHash("sha1");
  for (const f of [...listFiles(compDir, true), ...listFiles(HF_SHARED)]) {
    h.update(relative(ROOT, f).split(sep).join("/"));
    h.update(readFileSync(f));
  }
  h.update(JSON.stringify({ vars, box, seconds, fps, HF_VERSION }));
  const hash = h.digest("hex").slice(0, 10);

  const prefix = `${safeId(scene.id)}-`;
  const outRel = `projects/${sb.slug}/hf/${prefix}${hash}.webm`;
  return {
    sceneId: scene.id,
    comp: v.comp,
    compDir,
    box,
    frames: scene.durationInFrames,
    seconds,
    vars,
    unknownVars,
    missingCues,
    hash,
    outRel,
    outAbs: join(projectDir(sb.slug), "hf", `${prefix}${hash}.webm`),
    prefix,
  };
};

// What the video should show for a hyperframe scene right now: the exact render, else the latest older one
export const findHyperframeAsset = (slug: string, plan: HfPlan): { asset?: string; fresh: boolean } => {
  if (existsSync(plan.outAbs)) return { asset: plan.outRel, fresh: true };
  const dir = join(projectDir(slug), "hf");
  if (!existsSync(dir)) return { fresh: false };
  const older = readdirSync(dir)
    .filter((n) => n.startsWith(plan.prefix) && n.endsWith(".webm") && /^[0-9a-f]{10}\.webm$/.test(n.slice(plan.prefix.length)))
    .map((n) => ({ n, t: statSync(join(dir, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return older[0] ? { asset: `projects/${slug}/hf/${older[0].n}`, fresh: false } : { fresh: false };
};

// ---------- Tools: reuse what Remotion already installed (no extra ffmpeg/Chrome on the Mac) ----------
const works = (bin: string) => spawnSync(bin, ["-version"], { stdio: "ignore" }).status === 0;

export const findFfmpeg = (): { ffmpeg?: string; ffprobe?: string } => {
  if (process.env.FFMPEG_PATH && process.env.FFPROBE_PATH) return { ffmpeg: process.env.FFMPEG_PATH, ffprobe: process.env.FFPROBE_PATH };
  const exe = process.platform === "win32" ? ".exe" : "";
  const base = join(ROOT, "node_modules", "@remotion");
  if (existsSync(base)) {
    for (const d of readdirSync(base).filter((n) => n.startsWith("compositor-"))) {
      const ffmpeg = join(base, d, `ffmpeg${exe}`);
      const ffprobe = join(base, d, `ffprobe${exe}`);
      if (existsSync(ffmpeg) && existsSync(ffprobe) && works(ffmpeg)) return { ffmpeg, ffprobe };
    }
  }
  return {}; // let HyperFrames use a system ffmpeg
};

export const findChrome = (): string | undefined => {
  if (process.env.HYPERFRAMES_BROWSER_PATH) return process.env.HYPERFRAMES_BROWSER_PATH;
  const base = join(ROOT, "node_modules", ".remotion", "chrome-headless-shell");
  const want = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  for (const f of listFiles(base)) if (f.endsWith(sep + want)) return f;
  return process.env.REMOTION_BROWSER || undefined; // else HyperFrames downloads its own
};

export const hfEnv = (): NodeJS.ProcessEnv => {
  const { ffmpeg, ffprobe } = findFfmpeg();
  const chrome = findChrome();
  return {
    ...process.env,
    HYPERFRAMES_NO_TELEMETRY: "1",
    DO_NOT_TRACK: "1",
    HYPERFRAMES_NO_UPDATE_CHECK: "1",
    HYPERFRAMES_SKIP_SKILLS: "1",
    ...(ffmpeg ? { FFMPEG_PATH: ffmpeg, FFPROBE_PATH: ffprobe } : {}),
    ...(chrome ? { HYPERFRAMES_BROWSER_PATH: chrome } : {}),
  };
};

export const HF_BIN = join(ROOT, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
