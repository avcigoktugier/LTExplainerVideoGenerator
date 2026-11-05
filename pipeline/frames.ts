// Renders the project's HyperFrames scenes to transparent WebM clips (only the ones that changed).
// Usage: npm run frames -- <slug> [--force] [scene-id ...]
// Needs the timeline first (scene lengths come from the narration): npm run make does both.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Timeline } from "../src/schema";
import { HF_BIN, HF_SHARED, hfEnv, planHyperframe, type HfPlan } from "./hf";
import { loadStoryboard, projectDir, PUBLIC, readJson, ROOT, slugArg, writeJson } from "./lib";

const slug = slugArg();
const force = process.argv.includes("--force");
const only = process.argv.slice(3).filter((a) => !a.startsWith("--"));
const tlFile = join(projectDir(slug), "timeline.json");
if (!existsSync(tlFile)) {
  console.error(`No timeline yet. Run: npm run make -- ${slug}`);
  process.exit(1);
}
const sb = loadStoryboard(slug);
const tl = readJson<Timeline>(tlFile);
// Timing comes from the timeline (it depends on the narration); content always from the current storyboard
const sameShape = tl.scenes.length === sb.scenes.length && tl.scenes.every((s, i) => s.id === sb.scenes[i].id && s.say === sb.scenes[i].say);
if (!sameShape) {
  console.error(`Storyboard scenes or narration changed since the last timeline. Run: npm run make -- ${slug}`);
  process.exit(1);
}
const todo = tl.scenes
  .map((s, i) => ({ ...s, visual: sb.scenes[i].visual }))
  .filter((s) => s.visual.type === "hyperframe" && (!only.length || only.includes(s.id)));
if (!todo.length) process.exit(0);

// Copy the composition into a build folder sized and timed for this scene
const build = (plan: HfPlan): string => {
  const dir = join(ROOT, "out", "hf-build", slug, plan.prefix.slice(0, -1));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(plan.compDir, dir, { recursive: true });
  // Shared helpers + the project's bundled fonts → assets/ (compositions reference assets/...)
  mkdirSync(join(dir, "assets", "fonts"), { recursive: true });
  if (existsSync(HF_SHARED)) cpSync(HF_SHARED, join(dir, "assets"), { recursive: true });
  for (const f of readdirSync(join(PUBLIC, "fonts")).filter((n) => n.endsWith(".woff2"))) {
    cpSync(join(PUBLIC, "fonts", f), join(dir, "assets", "fonts", f));
  }
  cpSync(join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js"), join(dir, "assets", "gsap.min.js"));

  const { w, h } = plan.box;
  let html = readFileSync(join(dir, "index.html"), "utf8");
  const setAttr = (tag: string, name: string, value: string) =>
    new RegExp(`\\b${name}\\s*=`).test(tag) ? tag.replace(new RegExp(`\\b${name}\\s*=\\s*(["'])[^"']*\\1`), `${name}="${value}"`) : tag.replace(/\s*\/?>$/, (end) => ` ${name}="${value}"${end}`);
  // Root composition element: the first tag with data-composition-id
  let rootDone = false;
  html = html.replace(/<[a-zA-Z][^>]*\bdata-composition-id\b[^>]*>/, (tag) => {
    rootDone = true;
    let t = setAttr(tag, "data-duration", String(plan.seconds));
    t = setAttr(t, "data-width", String(w));
    return setAttr(t, "data-height", String(h));
  });
  if (!rootDone) throw new Error(`${plan.comp}: no element with data-composition-id`);
  // data-fill: stretch a clip to the end of the scene (data-duration = scene length − data-start)
  html = html.replace(/<[a-zA-Z][^>]*\bdata-fill\b[^>]*>/g, (tag) => {
    const start = Number(tag.match(/\bdata-start\s*=\s*["']([\d.]+)["']/)?.[1] ?? 0);
    return setAttr(tag, "data-duration", String(Math.max(0.1, Math.round((plan.seconds - start) * 1000) / 1000)));
  });
  html = html.replace(/(<html\b[^>]*?)\s+data-resolution\s*=\s*(["'])[^"']*\2/i, "$1");
  html = html.replace(/<meta\s+name=["']viewport["'][^>]*>/i, `<meta name="viewport" content="width=${w}, height=${h}" />`);
  html = html.replace(/<\/head>/i, `<style>html,body{width:${w}px;height:${h}px;background:transparent}</style>\n</head>`);
  writeFileSync(join(dir, "index.html"), html);
  writeJson(join(dir, "vars.json"), plan.vars);
  return dir;
};

let changed = false;
const env = hfEnv();
for (const scene of todo) {
  const plan = planHyperframe(sb, scene, tl.words, tl.fps);
  for (const k of plan.unknownVars) console.warn(`  ! scene ${scene.id}: "${k}" is not a variable of ${plan.comp} (check hyperframes/${plan.comp}/index.html)`);
  for (const c of plan.missingCues) console.warn(`  ! scene ${scene.id}: cue ${c} not found in this scene's narration — the composition's default time is used`);
  if (existsSync(plan.outAbs) && !force) {
    console.log(`- ${scene.id}: ${plan.comp} up to date`);
    continue;
  }
  console.log(`▶ ${scene.id}: rendering ${plan.comp} (${plan.box.w}×${plan.box.h}, ${plan.seconds}s)…`);
  const dir = build(plan);
  const tmp = `${plan.outAbs}.part.webm`;
  mkdirSync(join(projectDir(slug), "hf"), { recursive: true });
  const t0 = Date.now();
  const r = spawnSync(
    process.execPath,
    [HF_BIN, "render", dir, "--format", "webm", "--fps", String(tl.fps), "--variables-file", join(dir, "vars.json"), "-o", tmp, "--quiet",
      ...(process.env.HF_WORKERS ? ["--workers", process.env.HF_WORKERS] : [])],
    { cwd: ROOT, env, encoding: "utf8" },
  );
  if (r.status !== 0 || !existsSync(tmp)) {
    console.error(`✗ ${scene.id}: HyperFrames render failed\n${`${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n")}`);
    rmSync(tmp, { force: true });
    process.exitCode = 1;
    continue;
  }
  renameSync(tmp, plan.outAbs);
  // Remove this scene's older renders
  for (const n of readdirSync(join(projectDir(slug), "hf"))) {
    if (n.startsWith(plan.prefix) && n !== `${plan.prefix}${plan.hash}.webm`) rmSync(join(projectDir(slug), "hf", n), { force: true });
  }
  console.log(`✓ ${scene.id}: done in ${Math.round((Date.now() - t0) / 1000)}s`);
  changed = true;
}
// Refresh the timeline so it points at the new clips (and carries the current storyboard content)
if (changed) {
  const r = spawnSync(process.execPath, ["--import", "tsx", join(ROOT, "pipeline", "timeline.ts"), slug], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) console.error(`${r.stdout ?? ""}${r.stderr ?? ""}`.trim());
}
