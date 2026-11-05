// Shared by scene components and the SFX placer, so sounds land exactly on visual beats.
import { appearFrame, cueFrame, type CueCtx } from "./cues";
import type { StageEl, Visual } from "./schema";

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
    default:
      return [];
  }
};

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
