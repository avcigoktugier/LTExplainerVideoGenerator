import type { Word } from "./schema";

export const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");

export type CueCtx = { words: Word[]; from: number; durationInFrames: number; fps: number };

// Frame (relative to scene start) at which the narration says `cue` inside this scene.
// "kurşun" matches "kurşunun"; "kurşun#2" means the second occurrence.
export const cueFrame = (ctx: CueCtx, cue: string): number | null => {
  const [word, nth] = cue.split("#");
  const target = norm(word);
  if (!target) return null;
  const start = ctx.from / ctx.fps - 0.05;
  const end = (ctx.from + ctx.durationInFrames) / ctx.fps;
  let seen = 0;
  for (const w of ctx.words) {
    if (w.start < start || w.start >= end) continue;
    if (norm(w.text).startsWith(target) && ++seen >= Number(nth ?? 1)) {
      return Math.max(0, Math.round((w.start - ctx.from / ctx.fps) * ctx.fps));
    }
  }
  return null;
};

// When an element appears: its cue word, else `at` seconds, else a stagger by order.
export const appearFrame = (ctx: CueCtx | undefined, el: { cue?: string; at?: number }, index: number) => {
  if (el.cue && ctx) {
    const f = cueFrame(ctx, el.cue);
    if (f !== null) return f;
  }
  if (el.at !== undefined) return Math.round(el.at * (ctx?.fps ?? 30));
  return 6 + index * 5;
};
