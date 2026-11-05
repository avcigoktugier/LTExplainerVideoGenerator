// Renders one still per scene (at its busiest moment) plus a contact sheet,
// so Claude can look at every scene before the full render.
// Usage: npm run review -- <slug> [scene-id ...]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Timeline } from "../src/schema";
import { beats, ENTER, EXIT } from "../src/timing";
import { projectDir, readJson, ROOT, slugArg } from "./lib";
import { ENTRY, propsFile, remotion } from "./remotion-cli";

const slug = slugArg();
const only = process.argv.slice(3).filter((a) => !a.startsWith("--"));
const tlFile = join(projectDir(slug), "timeline.json");
if (!existsSync(tlFile)) {
  console.error(`No timeline. Run: npm run timeline -- ${slug}`);
  process.exit(1);
}
const tl = readJson<Timeline>(tlFile);
const dir = join(ROOT, "out", "review", slug);
if (!only.length) rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const props = propsFile(slug);

const index: string[] = [];
tl.scenes.forEach((s, i) => {
  if (only.length && !only.includes(s.id)) return;
  // After the last element has appeared, before the exit fade
  const ctx = { words: tl.words, from: s.from, durationInFrames: s.durationInFrames, fps: tl.fps };
  const lastBeat = Math.max(ENTER, ...beats(s.visual, s.durationInFrames, ctx)) + 14;
  const local = Math.min(s.durationInFrames - EXIT - 1, Math.max(lastBeat, Math.round(s.durationInFrames * 0.6)));
  const frame = s.from + Math.max(0, local);
  const name = `${String(i + 1).padStart(2, "0")}.png`;
  remotion(["still", ENTRY, "Explainer", join(dir, name), `--frame=${frame}`, `--props=${props}`, "--scale=0.5", "--log=error"]);
  index.push(`${name}  ${s.id}  (${s.visual.type}, frame ${frame})`);
});

// Contact sheet needs a full ffmpeg on PATH (Remotion's bundled one has no tile filter); skipped otherwise
if (!only.length && tl.scenes.length > 1) {
  const cols = Math.min(5, tl.scenes.length);
  const rows = Math.ceil(tl.scenes.length / cols);
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", join(dir, "%02d.png"), "-vf", `scale=270:-1,tile=layout=${cols}x${rows}:padding=8:color=gray`, "-frames:v", "1", join(dir, "contact-sheet.png")],
    { stdio: "ignore", shell: process.platform === "win32" },
  );
  if (r.status === 0) index.unshift("contact-sheet.png  (all scenes)");
}

console.log(`\n✓ review stills in out/review/${slug}/`);
console.log(index.join("\n"));
