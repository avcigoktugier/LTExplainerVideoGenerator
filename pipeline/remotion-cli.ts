import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, writeJson } from "./lib";

export const ENTRY = "src/index.ts";

export const propsFile = (slug: string) => {
  const file = join(ROOT, "out", `props-${slug}.json`);
  writeJson(file, { slug });
  return file;
};

export const remotion = (args: string[]) => {
  mkdirSync(join(ROOT, "out"), { recursive: true });
  // Optional: point Remotion at an existing Chrome instead of its auto-downloaded one
  const browser = process.env.REMOTION_BROWSER && args[0] !== "ffmpeg" ? [`--browser-executable=${process.env.REMOTION_BROWSER}`] : [];
  const win = process.platform === "win32";
  // Windows needs a shell to find npx.cmd; quote arguments so paths with spaces survive it
  const quote = (a: string) => (win && /\s/.test(a) ? `"${a}"` : a);
  const r = spawnSync("npx", ["remotion", ...args, ...browser].map(quote), {
    cwd: ROOT,
    stdio: "inherit",
    shell: win,
  });
  if (r.status !== 0) throw new Error(`remotion ${args[0]} failed`);
};
