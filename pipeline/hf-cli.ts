// The HyperFrames CLI with this project's ffmpeg/Chrome and telemetry off.
// Usage: npm run hf -- <command> [args]
//   npm run hf -- preview hyperframes/case-file     live preview of a composition (http://localhost:3002, or hfPreview in ports.json)
//   npm run hf -- check hyperframes/case-file       lint + runtime check
//   npm run hf -- snapshot hyperframes/case-file    PNG key frames for a visual check
//   npm run hf -- docs gsap                        built-in docs
// For a composition folder, the shared assets (kettek.css/js, GSAP, fonts) are copied into its assets/
// first, so it previews exactly as it renders. Those copies are generated (git-ignored).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { HF_BIN, HF_DIR, HF_SHARED, hfEnv } from "./hf";
import { PUBLIC, ROOT } from "./lib";
import { PORTS } from "./ports";

const args = process.argv.slice(2);
if (!args.length) {
  console.log("Usage: npm run hf -- <command> [args]   (e.g. preview hyperframes/case-file, check hyperframes/case-file, docs gsap)");
  process.exit(0);
}

export const syncAssets = (compDir: string) => {
  const a = join(compDir, "assets");
  mkdirSync(join(a, "fonts"), { recursive: true });
  if (existsSync(HF_SHARED)) cpSync(HF_SHARED, a, { recursive: true });
  for (const f of readdirSync(join(PUBLIC, "fonts")).filter((n) => n.endsWith(".woff2"))) cpSync(join(PUBLIC, "fonts", f), join(a, "fonts", f));
  cpSync(join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js"), join(a, "gsap.min.js"));
};

// First positional argument after the command that points into hyperframes/<comp>
const target = args.slice(1).find((x) => !x.startsWith("-"));
if (target) {
  const abs = resolve(ROOT, target);
  if (abs.startsWith(HF_DIR + sep) && existsSync(join(abs, "index.html")) && !abs.includes(`${sep}_`)) syncAssets(abs);
}
if (args[0] === "preview" && !args.some((a) => a.startsWith("--port"))) args.push("--port", String(PORTS.hfPreview));
const r = spawnSync(process.execPath, [HF_BIN, ...args], { cwd: ROOT, env: hfEnv(), stdio: "inherit" });
process.exit(r.status ?? 1);
