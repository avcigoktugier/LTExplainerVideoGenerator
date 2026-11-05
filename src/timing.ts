// Shared by scene components and the SFX placer, so sounds land exactly on visual beats.
import { appearFrame, cueFrame, type CueCtx } from "./cues";
import { simulate } from "./fx/physics";
import type { SketchStroke, StageEl, Visual } from "./schema";

export const ENTER = 12; // frames for a scene's entrance
export const EXIT = 6; // frames for a scene's fade-out

// Frame offsets (relative to scene start) where an element pops in
export const beats = (v: Visual, durationInFrames: number, ctx?: CueCtx): number[] => {
  switch (v.type) {
    case "icons":
      return v.items.map((_, i) => 8 + i * 8);
    case "steps": {
      const span = Math.max(30, durationInFrames - 20);
      return v.steps.map((_, i) => 6 + Math.round((i * span) / v.steps.length));
    }
    case "bars":
      return v.bars.map((_, i) => 10 + i * 6);
    case "compare":
      return [6, 6 + Math.round(durationInFrames * 0.35)];
    case "stage":
      return v.elements.map((el, i) => appearFrame(ctx, el, i));
    case "verdict": {
      const strike = (v.cue && ctx ? cueFrame(ctx, v.cue) : null) ?? Math.round(durationInFrames * 0.3);
      return [8, strike, strike + 14];
    }
    case "hyperframe":
      return Object.values(hyperframeCues(v, ctx)).map((c) => c.frame);
    case "sketch":
      return sketchStarts(v, ctx);
    case "object3d":
      return [actionFrame(v, ctx, durationInFrames)];
    case "particles":
      return [actionFrame(v, ctx, durationInFrames, v.effect === "rise" ? 0 : Math.round(Math.min(18, durationInFrames * 0.25)))];
    case "physics":
      return ctx ? simulate(v, durationInFrames, ctx.fps, ctx).impacts.map((x) => x.frame) : [];
    default:
      return [];
  }
};

// Sketch strokes: on their cue/at, otherwise each one starts as the previous is ~3/4 drawn
export const SKETCH_DUR: Record<SketchStroke["kind"], number> = { path: 0.9, icon: 0.8, circle: 0.6, arrow: 0.5, underline: 0.4, text: 0.6 };
export const sketchStarts = (v: Extract<Visual, { type: "sketch" }>, ctx?: CueCtx): number[] => {
  let next = 6;
  return v.strokes.map((st) => {
    const dur = Math.round((st.dur ?? SKETCH_DUR[st.kind]) * 30);
    const f = st.cue || st.at !== undefined ? appearFrame(ctx, st, 0) : next;
    next = f + Math.round(dur * 0.75);
    return f;
  });
};

// object3d action / particles burst: on the cue word, else a fixed share of the scene
export const actionFrame = (v: { cue?: string; at?: number }, ctx: CueCtx | undefined, durationInFrames: number, fallback = Math.round(durationInFrames * 0.45)) =>
  v.cue || v.at !== undefined ? appearFrame(ctx, v, 0) : fallback;

// Resolve a hyperframe scene's named cues to frames (relative to scene start). Unresolved cues are left out.
export const hyperframeCues = (v: Extract<Visual, { type: "hyperframe" }>, ctx?: CueCtx) => {
  const out: Record<string, { frame: number; sfx?: string }> = {};
  if (!ctx) return out;
  for (const [name, c] of Object.entries(v.cues ?? {})) {
    const word = typeof c === "string" ? c : c.word;
    const f = cueFrame(ctx, word);
    if (f !== null) out[name] = { frame: f, sfx: typeof c === "string" ? undefined : c.sfx };
  }
  return out;
};

// Default whoosh/pop per visual type; files are public/sfx/<name>.mp3
export const DEFAULT_SFX: Record<Visual["type"], { enter?: string; beat?: string }> = {
  kinetic: { enter: "whoosh" },
  bigNumber: { enter: "riser" },
  icons: { enter: "swoosh", beat: "pop" },
  mascot: { enter: "boing" },
  image: { enter: "swoosh" },
  compare: { enter: "whoosh", beat: "click" },
  steps: { enter: "swoosh", beat: "click" },
  bars: { enter: "whoosh", beat: "tick" },
  stage: { enter: "swoosh" }, // per-element sounds come from STAGE_SFX
  verdict: { enter: "swoosh", beat: "thud" },
  hyperframe: { enter: "swoosh" }, // cue sounds come from each cue's own `sfx`
  sketch: { enter: "swoosh" }, // quiet stroke sounds placed in pipeline/timeline.ts
  object3d: { enter: "whoosh" }, // action sound from OBJECT3D_SFX
  particles: { enter: "swoosh" }, // riser + ding on the burst
  physics: { enter: "whoosh" }, // one thud per card, on the frame it hits
};

// Sound on the 3D object's action
export const OBJECT3D_SFX: Record<Extract<Visual, { type: "object3d" }>["model"], string> = {
  scales: "ding",
  gavel: "thud",
  house: "click",
  document: "swoosh",
  courthouse: "ding",
  key: "click",
};

// Sound when a stage element appears (null = silent)
export const STAGE_SFX: Record<StageEl["kind"], string | null> = {
  person: "pop",
  scales: "swoosh",
  table: null,
  bullet: "tick",
  stamp: "thud",
  card: "click",
  tag: "tick",
  bubble: "pop",
  badge: "pop",
  panel: null,
  line: "swoosh",
  ground: null,
  icon: "pop",
  text: null,
  art: "pop",
};
