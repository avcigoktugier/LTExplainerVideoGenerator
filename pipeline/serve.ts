// Server mode — one command keeps everything running:
//   :3000  Remotion Studio (live preview, Render button)
//   :3001  Exports page (watch + download finished videos and review stills)
//   watcher: when a storyboard.json is saved, its timeline is rebuilt automatically
//   HyperFrames: changed hyperframe scenes (or edited compositions in hyperframes/) re-render in the background
//   self-healing: if Studio crashes it is restarted; creating the file out/restart-studio restarts it on demand
// Usage: npm run server        (ports: 3000/3001 by default, or from ports.json — pipeline/ports.ts)
// Both listen on every interface; the firewall decides who gets in:
//   :3000 only through an SSH tunnel; :3001 also from Tailscale addresses on Windows (so client PCs can download).
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, sep } from "node:path";
import { PUBLIC, ROOT } from "./lib";
import { PORTS } from "./ports";

const STUDIO_PORT = PORTS.studio; // 3000 unless ports.json says otherwise (see pipeline/ports.ts)
const EXPORTS_PORT = PORTS.exports; // 3001 by default
const OUT = join(ROOT, "out");
const RESTART_FLAG = join(OUT, "restart-studio");
const WIN = process.platform === "win32";
const log = (...a: unknown[]) => console.log(new Date().toLocaleString("tr-TR"), ...a);
mkdirSync(OUT, { recursive: true });

// ---------- 1. Remotion Studio (supervised) ----------
let studio: ChildProcess | null = null;
let stopping = false;
let requested = false; // restart asked for on purpose (not a crash)
let quickFails = 0;

// Kill Studio and everything it started (npx → node → Chrome)
const killTree = (p: ChildProcess | null) => {
  if (!p?.pid) return;
  if (WIN) spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-p.pid, "SIGTERM"); // whole process group (spawned detached)
    } catch {
      p.kill("SIGTERM");
    }
  }
};

const startStudio = () => {
  const startedAt = Date.now();
  const child = spawn("npx", ["remotion", "studio", "src/index.ts", `--port=${STUDIO_PORT}`, "--no-open", "--ipv4"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: WIN,
    detached: !WIN, // own process group on Linux/macOS so killTree reaches the whole tree
  });
  studio = child;
  child.on("exit", (code) => {
    if (stopping || studio !== child) return;
    if (requested) {
      requested = false;
      setTimeout(startStudio, 1500);
      return;
    }
    quickFails = Date.now() - startedAt < 30_000 ? quickFails + 1 : 0;
    const wait = Math.min(60, 3 * 2 ** Math.min(quickFails, 4)); // 3 s … 48 s backoff if it keeps failing
    log(`Studio stopped (code ${code}) — restarting in ${wait} s`);
    if (quickFails >= 3) log(`  Studio keeps failing to start. Is port ${STUDIO_PORT} used by another program (e.g. a manual "npm run studio")?`);
    setTimeout(startStudio, wait * 1000);
  });
};
startStudio();

const restartStudio = () => {
  log("Restarting Studio (requested)");
  quickFails = 0;
  requested = true;
  killTree(studio); // the exit handler above starts a fresh one
};

// ---------- 2. Storyboard watcher ----------
const pending = new Map<string, NodeJS.Timeout>();
const rebuild = (slug: string) => {
  if (!existsSync(join(PUBLIC, "projects", slug, "voice.json"))) {
    log(`[${slug}] storyboard saved — no voice yet. Run: npm run make -- ${slug} (or --mock)`);
    return;
  }
  const r = spawnSync("npx", ["tsx", "pipeline/timeline.ts", slug], { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.status === 0) {
    log(`[${slug}] timeline rebuilt — refresh Studio`, out.includes("!") ? `\n${out}` : "");
    if (out.includes("HyperFrames scene(s) need rendering")) queueFrames(slug);
  } else log(`[${slug}] ${out.includes("Narration changed") ? `narration changed — run: npm run voice -- ${slug}` : out}`);
};

// HyperFrames clips render in the background, one project at a time (they take a while)
const framesQueue: string[] = [];
let framesBusy = false;
const queueFrames = (slug: string) => {
  if (!framesQueue.includes(slug)) framesQueue.push(slug);
  if (framesBusy) return;
  const next = framesQueue.shift();
  if (!next) return;
  framesBusy = true;
  log(`[${next}] rendering HyperFrames scenes in the background…`);
  const child = spawn("npx", ["tsx", "pipeline/frames.ts", next], { cwd: ROOT, shell: WIN });
  let text = "";
  child.stdout?.on("data", (d) => (text += d));
  child.stderr?.on("data", (d) => (text += d));
  child.on("exit", (code) => {
    framesBusy = false;
    const lines = text.trim().split("\n").filter((l) => /^(✓|✗|\s+!)/.test(l.trim()) || /^\s+!/.test(l));
    log(`[${next}] HyperFrames ${code === 0 ? "ready — refresh Studio" : "render failed"}${lines.length ? `\n${lines.join("\n")}` : ""}`);
    if (code !== 0) log(text.trim().split("\n").slice(-15).join("\n"));
    queueFrames(""); // continue with anything queued meanwhile
  });
};

// Editing a composition in hyperframes/ re-renders every project that uses it
const HF_DIR = join(ROOT, "hyperframes");
const compStamp = (comp: string) => {
  const dirs = [join(HF_DIR, comp), join(HF_DIR, "_shared")];
  let m = 0;
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else m = Math.max(m, st.mtimeMs);
    }
  };
  dirs.forEach(walk);
  return m;
};
const projectsUsing = (comp: string) => {
  const dir = join(PUBLIC, "projects");
  return existsSync(dir)
    ? readdirSync(dir).filter((slug) => {
        const f = join(dir, slug, "storyboard.json");
        try {
          const sb = JSON.parse(readFileSync(f, "utf8")) as { scenes?: { visual?: { type?: string; comp?: string } }[] };
          return (sb.scenes ?? []).some((s) => s.visual?.type === "hyperframe" && s.visual.comp === comp);
        } catch {
          return false; // missing or half-saved storyboard
        }
      })
    : [];
};
const compSeen = new Map<string, number>();
const scanComps = (initial: boolean) => {
  if (!existsSync(HF_DIR)) return;
  for (const comp of readdirSync(HF_DIR)) {
    if (comp.startsWith("_") || comp.startsWith(".") || !statSync(join(HF_DIR, comp)).isDirectory()) continue;
    const m = compStamp(comp);
    if (!initial && compSeen.get(comp) !== m) {
      clearTimeout(pending.get(`hf:${comp}`));
      pending.set(
        `hf:${comp}`,
        setTimeout(() => {
          for (const slug of projectsUsing(comp)) rebuild(slug);
        }, 1500),
      );
    }
    compSeen.set(comp, m);
  }
};
scanComps(true);
// Poll modification times once a second: works the same on every OS and editor
// (recursive fs.watch on Linux stops firing after files are replaced).
const seen = new Map<string, number>();
const scan = (initial: boolean) => {
  const dir = join(PUBLIC, "projects");
  if (!existsSync(dir)) return;
  for (const slug of readdirSync(dir)) {
    const file = join(dir, slug, "storyboard.json");
    if (!existsSync(file)) continue;
    const m = statSync(file).mtimeMs;
    if (seen.get(slug) !== m && !initial) {
      clearTimeout(pending.get(slug));
      pending.set(slug, setTimeout(() => rebuild(slug), 700)); // editors save in bursts
    }
    seen.set(slug, m);
  }
};
scan(true);
setInterval(() => {
  scan(false);
  scanComps(false);
  if (existsSync(RESTART_FLAG)) {
    rmSync(RESTART_FLAG, { force: true });
    restartStudio();
  }
}, 1000);

// ---------- 3. Exports page ----------
const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json" };
const listFiles = () => {
  const found: { rel: string; size: number; mtime: number }[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (TYPES[extname(name)] && extname(name) !== ".json") found.push({ rel: relative(OUT, p).split(sep).join("/"), size: st.size, mtime: st.mtimeMs });
    }
  };
  walk(OUT);
  return found.sort((a, b) => b.mtime - a.mtime);
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const page = () => {
  const files = listFiles();
  const videos = files.filter((f) => f.rel.endsWith(".mp4"));
  const stills = files.filter((f) => f.rel.endsWith(".png"));
  const when = (t: number) => new Date(t).toLocaleString("tr-TR");
  const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Videolar</title><style>
body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f4f1ea;color:#1b2a41}
h1{font-size:22px;margin:0 0 4px}p.s{color:#777;margin:0 0 24px}h2{font-size:16px;margin:28px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 3px #0002}
video,img{width:100%;border-radius:8px;background:#000;aspect-ratio:9/16;object-fit:contain}
.n{font-weight:600;font-size:14px;margin:8px 0 2px;word-break:break-all}.m{font-size:12px;color:#777}
a.dl{display:inline-block;margin-top:8px;background:#1b2a41;color:#fff;text-decoration:none;padding:7px 12px;border-radius:8px;font-size:13px}
</style></head><body><h1>Dışa aktarılan videolar</h1><p class="s">En yenisi en üstte. Sayfayı yenileyince yeni dosyalar görünür.</p>
<h2>Videolar (${videos.length})</h2><div class="grid">${videos
    .map((f) => `<div class="card"><video src="/f/${encodeURI(f.rel)}" controls preload="metadata"></video><div class="n">${esc(f.rel)}</div><div class="m">${when(f.mtime)} · ${mb(f.size)}</div><a class="dl" href="/f/${encodeURI(f.rel)}?dl=1">İndir</a></div>`)
    .join("") || "<p>Henüz video yok. Studio'da Render'a basın ya da Claude'a 'final render al' deyin.</p>"}</div>
<h2>İnceleme kareleri (${stills.length})</h2><div class="grid">${stills
    .slice(0, 40)
    .map((f) => `<div class="card"><a href="/f/${encodeURI(f.rel)}"><img src="/f/${encodeURI(f.rel)}" loading="lazy"></a><div class="n">${esc(f.rel)}</div></div>`)
    .join("")}</div></body></html>`;
};
createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page());
  }
  if (url.pathname.startsWith("/f/")) {
    const file = normalize(join(OUT, decodeURIComponent(url.pathname.slice(3))));
    if (!file.startsWith(OUT + sep) || !existsSync(file) || !TYPES[extname(file)]) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const size = statSync(file).size;
    const headers: Record<string, string | number> = { "Content-Type": TYPES[extname(file)], "Accept-Ranges": "bytes" };
    if (url.searchParams.has("dl")) headers["Content-Disposition"] = `attachment; filename="${file.split(sep).pop()}"`;
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = Number(range[1] || 0);
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
      return createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, "Content-Length": size });
    return createReadStream(file).pipe(res);
  }
  res.writeHead(404);
  res.end();
}).listen(EXPORTS_PORT, "0.0.0.0", () => log(`Exports page on http://localhost:${EXPORTS_PORT}`));

log(`Studio on http://localhost:${STUDIO_PORT} · watching public/projects/*/storyboard.json`);
const stop = () => {
  stopping = true;
  killTree(studio);
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
