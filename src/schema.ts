import { z } from "zod";

// ---------- Visuals: one per scene ----------
const Kinetic = z.object({
  type: z.literal("kinetic"),
  lines: z.array(z.string()).min(1), // big on-screen text, 1-3 short lines
  emphasis: z.array(z.string()).optional(), // words to color with accent
});

const BigNumber = z.object({
  type: z.literal("bigNumber"),
  value: z.number(),
  prefix: z.string().optional(), // "₺", "%"
  suffix: z.string().optional(),
  decimals: z.number().optional(),
  grouping: z.boolean().optional(), // false for years: 1994 not 1.994
  label: z.string(),
});

const Icons = z.object({
  type: z.literal("icons"),
  title: z.string().optional(),
  items: z
    .array(z.object({ icon: z.string(), label: z.string() })) // icon = lucide name, e.g. "QrCode"
    .min(1)
    .max(6),
});

const Mascot = z.object({
  type: z.literal("mascot"),
  bubble: z.string(), // speech-bubble text
  mood: z.enum(["happy", "curious", "shocked"]).optional(),
});

const Image = z.object({
  type: z.literal("image"),
  file: z.string().optional(), // relative to the project's img/ folder
  prompt: z.string().optional(), // used by `npm run images` to generate the file
  useCharacter: z.boolean().optional(), // send public/brand/character.png as reference for a consistent character
  caption: z.string().optional(),
  motion: z.enum(["zoomIn", "zoomOut", "panLeft", "panRight"]).optional(),
});

const Compare = z.object({
  type: z.literal("compare"),
  left: z.object({ title: z.string(), items: z.array(z.string()) }),
  right: z.object({ title: z.string(), items: z.array(z.string()) }),
});

const Steps = z.object({
  type: z.literal("steps"),
  title: z.string().optional(),
  steps: z.array(z.string()).min(2).max(5),
});

const Bars = z.object({
  type: z.literal("bars"),
  title: z.string().optional(),
  unit: z.string().optional(),
  bars: z.array(z.object({ label: z.string(), value: z.number() })).min(2).max(6),
  highlight: z.number().optional(), // index of the bar to accent
});

// ---------- Stage: a flat illustration composed from parts (dossier format) ----------
// Canvas is 940 x 720. x/y are in canvas pixels. For people and props, y is where the feet / base sit.
// Each element appears when the narration reaches its `cue` word (or at `at` seconds into the scene).
const Timing = {
  cue: z.string().optional(), // a word from this scene's `say`; prefix match, "kurşun" matches "kurşunun"
  at: z.number().optional(), // seconds from scene start, if no cue
  enter: z.enum(["pop", "fade", "slideLeft", "slideRight", "drop", "draw", "none"]).optional(),
};
const Color = z.string(); // "cast1" | "cast2" | "cast3" | "ink" | "accent" | "muted" | "danger" | "#hex"
const Pt = z.tuple([z.number(), z.number()]);

const El = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("person"),
    x: z.number(),
    y: z.number(),
    color: Color.optional(),
    pose: z.enum(["stand", "aimLeft", "aimRight", "sign", "raise", "lying"]).optional(),
    mood: z.enum(["neutral", "shocked", "sad", "happy", "worried"]).optional(),
    look: z.enum(["left", "right", "front"]).optional(),
    sign: z.string().optional(), // text on the board for pose "sign"
    hair: z.enum(["short", "long", "bun", "curly", "bald", "headscarf"]).optional(),
    outfit: z.enum(["plain", "suit", "dress", "robe"]).optional(),
    accessories: z.array(z.enum(["veil", "glasses", "mustache", "beard"])).optional(),
    hairColor: Color.optional(),
    scale: z.number().optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("scales"),
    x: z.number(),
    y: z.number(),
    tilt: z.number().min(-1).max(1).optional(), // -1 left pan down, 1 right pan down
    wobble: z.boolean().optional(),
    left: z.string().optional(),
    right: z.string().optional(),
    ...Timing,
  }),
  z.object({ kind: z.literal("table"), x: z.number(), y: z.number(), w: z.number().optional(), ...Timing }),
  z.object({
    kind: z.literal("bullet"),
    x: z.number(),
    y: z.number(),
    color: Color.optional(),
    label: z.string().optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("stamp"),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    rotate: z.number().optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("card"),
    x: z.number(),
    y: z.number(),
    w: z.number().optional(),
    label: z.string().optional(),
    value: z.string(),
    strike: z.boolean().optional(), // strike the value through (animated)
    dim: z.boolean().optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("tag"),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    color: Color.optional(),
    outline: z.boolean().optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("bubble"),
    x: z.number(),
    y: z.number(),
    text: z.string().optional(),
    icon: z.string().optional(), // Lucide icon name, for a thought bubble
    variant: z.enum(["speech", "thought"]).optional(),
    tail: z.enum(["left", "right", "down"]).optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("badge"),
    x: z.number(),
    y: z.number(),
    symbol: z.enum(["?", "x", "check", "!"]),
    size: z.number().optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("panel"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    ruler: z.boolean().optional(), // height marks, like a line-up wall
    ...Timing,
  }),
  z.object({
    kind: z.literal("line"),
    from: Pt,
    to: Pt,
    dashed: z.boolean().optional(),
    color: Color.optional(),
    ...Timing,
  }),
  z.object({ kind: z.literal("ground"), y: z.number(), ...Timing }),
  // Custom artwork from public/art/<name>.svg — drawn by Claude when the kit lacks a visual
  z.object({
    kind: z.literal("art"),
    name: z.string().regex(/^[a-z0-9-]+$/),
    x: z.number(),
    y: z.number(),
    w: z.number().optional(), // width in px (height follows the viewBox)
    color: Color.optional(), // fills var(--main) in the SVG
    flip: z.boolean().optional(), // mirror horizontally
    rotate: z.number().optional(),
    anchor: z.enum(["base", "center"]).optional(), // base (default): stands on (x, y)
    idle: z.enum(["none", "bob", "sway", "spin", "pulse"]).optional(), // looping motion after it appears
    ...Timing,
  }),
  z.object({
    kind: z.literal("icon"),
    x: z.number(),
    y: z.number(),
    name: z.string(), // Lucide icon name
    size: z.number().optional(),
    color: Color.optional(),
    ...Timing,
  }),
  z.object({
    kind: z.literal("text"),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    size: z.number().optional(),
    font: z.enum(["serif", "mono", "sans"]).optional(),
    color: Color.optional(),
    ...Timing,
  }),
]);
export type StageEl = z.infer<typeof El>;

const Stage = z.object({ type: z.literal("stage"), elements: z.array(El).min(1) });

// Legal reclassification: "from" gets struck through, "to" lands
const Verdict = z.object({
  type: z.literal("verdict"),
  label: z.string().optional(), // "SUÇ VASFI"
  from: z.string(),
  to: z.string().optional(),
  cue: z.string().optional(), // word on which the strike happens
});

// HyperFrames: an HTML/GSAP composition from hyperframes/<comp>/, rendered to a transparent video
// at this scene's exact length by `npm run frames`, then placed in the scene area (or over the whole frame).
const HfCue = z.union([
  z.string(), // a word from this scene's `say` (prefix match, "kurşun#2" = 2nd occurrence)
  z.object({ word: z.string(), sfx: z.string().optional() }), // + a sound when it hits
]);
const Hyperframe = z.object({
  type: z.literal("hyperframe"),
  comp: z.string().regex(/^[a-z0-9-]+$/), // folder name in hyperframes/
  vars: z.record(z.string(), z.unknown()).optional(), // values for the composition's declared variables
  cues: z.record(z.string(), HfCue).optional(), // { "stamp": "ispat" } → variable cue_stamp = seconds into the scene
  area: z.enum(["scene", "full"]).optional(), // scene (default): the scene box; full: whole 1080x1920 frame, over the layout
});

export const Visual = z.discriminatedUnion("type", [
  Kinetic,
  BigNumber,
  Icons,
  Mascot,
  Image,
  Compare,
  Steps,
  Bars,
  Stage,
  Verdict,
  Hyperframe,
]);
export type Visual = z.infer<typeof Visual>;

export const SfxName = z.string(); // file name in public/sfx without .mp3

export const Scene = z.object({
  id: z.string(),
  say: z.string().min(1), // Turkish narration for this scene
  visual: Visual,
  sfx: z.union([SfxName, z.literal("none")]).optional(), // override default sfx
  // Dossier format only — consecutive scenes with the same chapter share a progress dot
  chapter: z.string().optional(), // kicker above the headline, e.g. "CEZA HUKUKU · YAN YANA FAİLLİK"
  headline: z.string().optional(), // "İkisi de ateş etti. *Kim* öldürdü?" — *word* = italic accent
  source: z.string().optional(), // footer line, e.g. "TCK m.35 · m.37 · m.81"
});
export type Scene = z.infer<typeof Scene>;

export const Storyboard = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  style: z.string().default("kettek-dark"),
  format: z.enum(["explainer", "dossier"]).default("explainer"),
  brand: z
    .object({
      name: z.string(), // shown in the header, e.g. "LAW TRUST"
      logo: z.string().optional(), // file in public/brand/
      watermark: z.string().optional(), // faint mark in the dossier header, file in public/brand/
      series: z.string().optional(), // header right label, e.g. "DOSYA N°"
      disclaimer: z.string().optional(), // footer line on the last scene
    })
    .optional(),
  episode: z.number().optional(), // shown after `series`
  handle: z.string().optional(), // "@kettek" watermark
  music: z.string().optional(), // file in public/music
  voice: z
    .object({
      provider: z.enum(["elevenlabs", "google", "mock"]).default("elevenlabs"),
      voiceId: z.string().optional(), // ElevenLabs voice id, or Google voice name
      model: z.string().optional(),
      speed: z.number().min(0.7).max(1.3).optional(),
    })
    .default({ provider: "elevenlabs" }),
  scenes: z.array(Scene).min(1),
});
export type Storyboard = z.infer<typeof Storyboard>;

// ---------- Generated by the pipeline ----------
export type Word = { text: string; start: number; end: number }; // seconds

export type VoiceResult = {
  provider: string;
  sayHash: string; // detects narration edits after voicing
  clips: { src: string; start: number; duration: number }[]; // seconds, src relative to public/
  sceneStarts: number[]; // seconds
  words: Word[];
  total: number; // seconds
};

export type TimelineScene = Scene & {
  from: number;
  durationInFrames: number;
  asset?: string; // resolved image/video path relative to public/, when the file exists
  assetFresh?: boolean; // hyperframe: rendered for this exact scene length and variables
};

export type Timeline = {
  slug: string;
  title: string;
  style: string;
  format: "explainer" | "dossier";
  brand?: Storyboard["brand"];
  episode?: number;
  handle?: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  clips: { src: string; from: number }[];
  music?: string;
  sfx: { src: string; from: number; volume: number }[];
  words: Word[];
  scenes: TimelineScene[];
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
