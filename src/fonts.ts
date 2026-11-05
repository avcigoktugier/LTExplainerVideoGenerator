import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// All fonts are bundled in public/fonts (SIL OFL) — no network needed at render time.
// Each family ships a latin + latin-ext file; latin-ext carries ğ ş İ and ₺, latin carries ı ç ö ü.
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

export const FONT_FAMILY = "KetInter"; // sans: UI, captions (explainer format)
export const SERIF_FAMILY = "KetSerif"; // Fraunces: headlines (dossier format)
export const MONO_FAMILY = "KetMono"; // IBM Plex Mono: labels, sources

type Face = { family: string; file: string; range: string; weight: string; style?: "normal" | "italic" };
const FACES: Face[] = [
  { family: FONT_FAMILY, file: "inter-latin-wght-normal", range: LATIN, weight: "100 900" },
  { family: FONT_FAMILY, file: "inter-latin-ext-wght-normal", range: LATIN_EXT, weight: "100 900" },
  { family: SERIF_FAMILY, file: "fraunces-latin-wght-normal", range: LATIN, weight: "100 900" },
  { family: SERIF_FAMILY, file: "fraunces-latin-ext-wght-normal", range: LATIN_EXT, weight: "100 900" },
  { family: SERIF_FAMILY, file: "fraunces-latin-wght-italic", range: LATIN, weight: "100 900", style: "italic" },
  { family: SERIF_FAMILY, file: "fraunces-latin-ext-wght-italic", range: LATIN_EXT, weight: "100 900", style: "italic" },
  { family: MONO_FAMILY, file: "ibm-plex-mono-latin-600-normal", range: LATIN, weight: "600" },
  { family: MONO_FAMILY, file: "ibm-plex-mono-latin-ext-600-normal", range: LATIN_EXT, weight: "600" },
];

if (typeof document !== "undefined") {
  const handle = delayRender("Loading bundled fonts");
  Promise.all(
    FACES.map((f) =>
      new FontFace(f.family, `url(${staticFile(`fonts/${f.file}.woff2`)}) format("woff2")`, {
        weight: f.weight,
        style: f.style ?? "normal",
        unicodeRange: f.range,
      })
        .load()
        .then((face) => document.fonts.add(face)),
    ),
  )
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
}
