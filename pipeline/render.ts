// Usage: npm run render -- <slug>            1080x1920 MP4
//        npm run render -- <slug> --4k       2160x3840 (same layout, scaled)
//        npm run render -- <slug> --draft    540x960, fast preview
//        add --gpu to any of them: Chrome draws with the GPU (--gl=angle), and the MP4 is encoded in
//        hardware where that works (any Mac: VideoToolbox; Windows/Linux: only with an NVIDIA GPU).
//        If hardware encoding fails, it re-renders with software encoding automatically.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { projectDir, slugArg } from "./lib";
import { ENTRY, propsFile, remotion } from "./remotion-cli";

const slug = slugArg();
if (!existsSync(join(projectDir(slug), "timeline.json"))) {
  console.error(`No timeline. Run: npm run make -- ${slug}`);
  process.exit(1);
}
const k4 = process.argv.includes("--4k");
const draft = process.argv.includes("--draft");
const gpu = process.argv.includes("--gpu");
const out = join("out", `${slug}${k4 ? "-4k" : draft ? "-draft" : ""}.mp4`);

// Hardware encoding: VideoToolbox on every Mac; elsewhere NVENC, which needs an NVIDIA GPU
// (without one, Remotion's "if-possible" still picks NVENC and the encoder crashes)
const hasNvidia = () => spawnSync("nvidia-smi", ["-L"], { stdio: "ignore", shell: process.platform === "win32" }).status === 0;
const hwEncode = gpu && (process.platform === "darwin" || hasNvidia());

const run = (hw: boolean) => {
  // CRF in software; a bitrate with hardware encoding (CRF isn't supported there)
  const quality = hw
    ? [`--video-bitrate=${k4 ? "30M" : draft ? "3M" : "10M"}`, "--hardware-acceleration=if-possible"]
    : draft
      ? ["--crf=28"]
      : [];
  if (hw) process.env.KETTEK_GPU = "1"; // remotion.config.ts skips its CRF default
  else delete process.env.KETTEK_GPU;
  remotion([
    "render", ENTRY, "Explainer", out,
    `--props=${propsFile(slug)}`,
    ...(k4 ? ["--scale=2"] : draft ? ["--scale=0.5"] : []),
    ...(gpu ? ["--gl=angle"] : []),
    ...quality,
    "--audio-bitrate=192k",
  ]);
};

const t0 = Date.now();
if (gpu) console.log(`GPU mode: GPU drawing on, ${hwEncode ? "hardware encoding" : "software encoding (no hardware encoder here)"}`);
try {
  run(hwEncode);
} catch (e) {
  if (!hwEncode) throw e;
  console.log("\nHardware encoding failed — rendering again with software encoding…\n");
  run(false);
}
console.log(`\n✓ ${out}  (${Math.round((Date.now() - t0) / 1000)}s${gpu ? ", GPU mode" : ""})`);
