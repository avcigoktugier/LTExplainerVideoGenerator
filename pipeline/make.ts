// One command for the common loop: voice (if narration changed) → images → timeline → HyperFrames clips → review stills.
// Usage: npm run make -- <slug> [--mock]
import { spawnSync } from "node:child_process";
import { loadStoryboard, ROOT, slugArg } from "./lib";

const slug = slugArg();
const mock = process.argv.includes("--mock");
const sb = loadStoryboard(slug);

const run = (script: string, extra: string[] = []) => {
  const r = spawnSync("npx", ["tsx", `pipeline/${script}.ts`, slug, ...extra], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("voice", mock ? ["--mock"] : []);
const needsImages = sb.scenes.some((s) => s.visual.type === "image" && s.visual.prompt);
if (needsImages && process.env.GEMINI_API_KEY) run("images");
else if (needsImages) console.log("(image scenes have prompts but GEMINI_API_KEY is empty — placeholders will show)");
run("timeline");
if (sb.scenes.some((s) => s.visual.type === "hyperframe")) run("frames");
run("review");
