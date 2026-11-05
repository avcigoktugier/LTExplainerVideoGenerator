import { FONT_FAMILY, MONO_FAMILY, SERIF_FAMILY } from "./fonts";

const sans = `${FONT_FAMILY}, Inter, system-ui, sans-serif`;
const serif = `${SERIF_FAMILY}, Georgia, serif`;
const mono = `${MONO_FAMILY}, ui-monospace, monospace`;

export type Style = {
  name: string;
  font: string; // body / captions
  fontSerif: string; // dossier headlines
  fontMono: string; // labels, sources
  bg: string; // page background
  bg2: string; // secondary surface (cards)
  ink: string; // main text
  muted: string;
  accent: string;
  accent2: string;
  danger: string;
  radius: number;
  grain: boolean; // subtle noise overlay
  grid: boolean; // faint paper grid (dossier)
  cast: [string, string, string]; // illustration people colors: cast1..cast3
  // Appended to every AI image prompt so generated art stays on-brand
  imagePrompt: string;
  // Character colors
  mascot: { body: string; belly: string; outline: string };
  // Dark looks: a full-bleed dark page with glow, glass cards and gold dust instead of paper
  dark?: boolean;
  band?: string; // dossier masthead background (default: ink)
  onBand?: string; // text on the masthead (default: bg)
  skin?: string; // illustrated people: face/hands (default: bg2)
  outline?: string; // illustrated people: line color (default: ink)
};

export const STYLES: Record<string, Style> = {
  "kettek-dark": {
    name: "kettek-dark",
    font: sans,
    fontSerif: serif,
    fontMono: mono,
    bg: "#0B1020",
    bg2: "#151C33",
    ink: "#F4F6FB",
    muted: "#8E97B3",
    accent: "#C6FF3D",
    accent2: "#4CC9F0",
    danger: "#FF5A5F",
    radius: 36,
    grain: true,
    grid: false,
    cast: ["#C6FF3D", "#4CC9F0", "#8E97B3"],
    imagePrompt:
      "flat vector illustration, bold simple shapes, dark navy background #0B1020, lime #C6FF3D and cyan #4CC9F0 highlights, no text, no letters, no logos, centered subject, generous empty space, clean editorial infographic style",
    mascot: { body: "#C6FF3D", belly: "#E9FFB3", outline: "#0B1020" },
  },
  paper: {
    name: "paper",
    font: sans,
    fontSerif: serif,
    fontMono: mono,
    bg: "#F3EEE3",
    bg2: "#FFFFFF",
    ink: "#141414",
    muted: "#6B665C",
    accent: "#E63B2E",
    accent2: "#1F5EFF",
    danger: "#E63B2E",
    radius: 28,
    grain: true,
    grid: false,
    cast: ["#141414", "#E63B2E", "#1F5EFF"],
    imagePrompt:
      "hand-drawn ink illustration with flat red #E63B2E and blue #1F5EFF fills, warm off-white paper background #F3EEE3, risograph texture, no text, no letters, no logos, centered subject, editorial magazine style",
    mascot: { body: "#1F5EFF", belly: "#BFD0FF", outline: "#141414" },
  },
  // Law Trust — PLACEHOLDER palette (navy + brass on ivory). Replace with the firm's brand colors.
  lawtrust: {
    name: "lawtrust",
    font: sans,
    fontSerif: serif,
    fontMono: mono,
    bg: "#F2ECDF",
    bg2: "#FBF7EE",
    ink: "#1B2A41",
    muted: "#8C8677",
    accent: "#B58A3C",
    accent2: "#6E819B",
    danger: "#9A3A2E",
    radius: 14,
    grain: true,
    grid: true,
    cast: ["#1B2A41", "#B58A3C", "#6E819B"],
    imagePrompt:
      "flat editorial vector illustration, navy #1B2A41 and brass #B58A3C on warm ivory paper #F2ECDF, thin dark outlines, no text, no letters, no logos, centered subject, minimal legal infographic style",
    mascot: { body: "#B58A3C", belly: "#F0DDB3", outline: "#1B2A41" },
  },
  // Law & Trust, modern: near-black page, LT gold as the single accent, glass cards, soft glow
  "lawtrust-dark": {
    name: "lawtrust-dark",
    font: sans,
    fontSerif: serif,
    fontMono: mono,
    bg: "#0B0F17",
    bg2: "#141B27",
    ink: "#F2F4F8",
    muted: "#8A93A6",
    accent: "#C9A45C",
    accent2: "#7E93B3",
    danger: "#E0645A",
    radius: 22,
    grain: true,
    grid: false,
    cast: ["#C9A45C", "#7E93B3", "#D9DDE4"],
    imagePrompt:
      "modern premium 3D-lit editorial illustration, near-black background #0B0F17, warm gold #C9A45C highlights and soft rim light, subtle glass and metal materials, no text, no letters, no logos, centered subject, generous empty space",
    mascot: { body: "#C9A45C", belly: "#F0DDB3", outline: "#0B0F17" },
    dark: true,
    band: "#0F1520",
    onBand: "#F2F4F8",
    skin: "#EDE6DA",
    outline: "#0B0F17",
  },
};

export const getStyle = (name: string): Style => STYLES[name] ?? STYLES["kettek-dark"];

// Resolve a storyboard color name to a hex
export const resolveColor = (style: Style, c: string | undefined, fallback: string) => {
  if (!c) return fallback;
  const named: Record<string, string> = {
    cast1: style.cast[0],
    cast2: style.cast[1],
    cast3: style.cast[2],
    ink: style.ink,
    accent: style.accent,
    accent2: style.accent2,
    muted: style.muted,
    danger: style.danger,
    paper: style.bg2,
  };
  return named[c] ?? c;
};

// Layout safe zones for 1080x1920 (Reels/TikTok/Shorts UI overlays)
// Scene content lives between top and bottom; captions sit just below it, above the app's own UI.
export const SAFE = { top: 200, bottom: 520, side: 70 };

// Turkish-aware uppercase: "istanbul" -> "İSTANBUL", not "ISTANBUL"
export const trUpper = (s: string) => s.toLocaleUpperCase("tr-TR");
