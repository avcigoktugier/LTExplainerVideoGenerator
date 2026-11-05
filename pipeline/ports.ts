// Ports for this copy of the project. To run two copies side by side, give one of them a
// ports.json in its root folder, e.g. { "studio": 3010, "exports": 3011, "hfPreview": 3012 }.
// Environment variables STUDIO_PORT / EXPORTS_PORT / HF_PREVIEW_PORT override the file.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib";

type Ports = { studio: number; exports: number; hfPreview: number };
const DEFAULTS: Ports = { studio: 3000, exports: 3001, hfPreview: 3002 };

const fromFile = (): Partial<Ports> => {
  const f = join(ROOT, "ports.json");
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    console.warn("ports.json is not valid JSON — using the default ports");
    return {};
  }
};

const file = fromFile();
const pick = (env: string | undefined, v: unknown, d: number) => {
  const n = Number(env ?? v ?? d);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : d;
};

export const PORTS: Ports = {
  studio: pick(process.env.STUDIO_PORT, file.studio, DEFAULTS.studio),
  exports: pick(process.env.EXPORTS_PORT, file.exports, DEFAULTS.exports),
  hfPreview: pick(process.env.HF_PREVIEW_PORT, file.hfPreview, DEFAULTS.hfPreview),
};

// `npx tsx pipeline/ports.ts` prints them (used by CLAUDE.md to find this copy's preview)
if (process.argv[1]?.replace(/\\/g, "/").endsWith("pipeline/ports.ts")) {
  console.log(`studio http://localhost:${PORTS.studio}  exports http://localhost:${PORTS.exports}  hf-preview http://localhost:${PORTS.hfPreview}`);
}
