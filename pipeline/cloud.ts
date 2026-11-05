// Render on GitHub instead of this computer, then put the MP4 on the Desktop.
// Usage: npm run bulut -- <slug> [--draft|--4k] [--mock]
//   1. checks the timeline is current (narration voiced), commits the project and pushes it
//   2. starts the "Render" workflow (.github/workflows/render.yml) for exactly that commit
//   3. waits for it, downloads the video to out/ and copies it to the Desktop
// Needs GITHUB_TOKEN in .env (a fine-grained token for this repository only: Contents + Actions read/write).
// Falls back to the GitHub CLI's login (`gh auth token`) when the token is missing.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { projectDir, readJson, ROOT, slugArg } from "./lib";

const slug = slugArg();
const draft = process.argv.includes("--draft");
const k4 = process.argv.includes("--4k");
const mock = process.argv.includes("--mock");
const quality = k4 ? "4k" : draft ? "draft" : "normal";
const file = `${slug}${k4 ? "-4k" : draft ? "-draft" : ""}.mp4`;
const BRANCH = "master";
const WORKFLOW = "render.yml";

const fail = (msg: string): never => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};
const git = (args: string[], extra: string[] = []) => execFileSync("git", [...extra, ...args], { cwd: ROOT, encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Run = { id: number; html_url: string; status: string; conclusion: string | null };

// ---------- who / where ----------
const envToken = process.env.GITHUB_TOKEN?.trim();
let token = envToken;
if (!token) {
  const gh = spawnSync("gh", ["auth", "token"], { encoding: "utf8", shell: process.platform === "win32" });
  if (gh.status === 0) token = gh.stdout.trim();
}
if (!token) fail("GITHUB_TOKEN .env dosyasında yok. Kurulumu yapan kişiden anahtarı isteyin.");
const remote = git(["remote", "get-url", "origin"]);
const repo = process.env.GITHUB_REPO ?? remote.match(/github\.com[:/](.+?)(\.git)?$/)?.[1];
if (!repo) fail(`GitHub deposu anlaşılamadı (origin: ${remote}).`);
// .env token as a one-off header for git (never written into git config or the remote URL);
// without one, git uses this computer's own GitHub login
const auth = envToken ? ["-c", `http.extraHeader=Authorization: Basic ${Buffer.from(`x-access-token:${envToken}`).toString("base64")}`] : [];

const api = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...init.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) fail("GitHub anahtarı geçersiz ya da süresi dolmuş (401). Kurulumu yapan kişiden yenisini isteyin.");
    if (res.status === 403 || res.status === 404) fail(`GitHub erişimi reddedildi (${res.status}). Anahtarın bu depoya "Actions" ve "Contents" yazma izni olmalı.\n${body.slice(0, 300)}`);
    fail(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
};

async function main() {
  // ---------- 1. project ready? ----------
  if (!existsSync(join(projectDir(slug), "storyboard.json"))) fail(`public/projects/${slug}/storyboard.json yok.`);
  if (!mock) {
    const voiceFile = join(projectDir(slug), "voice.json");
    if (!existsSync(voiceFile)) fail(`Ses yok. Önce: npm run voice -- ${slug}`);
    const voice = readJson<{ provider: string; clips: { src: string }[] }>(voiceFile);
    if (voice.provider === "mock") fail(`Bu projenin sesi deneme sesi (mock). Gerçek ses için: npm run voice -- ${slug}  (ya da sessiz deneme: --mock)`);
    for (const c of voice.clips) if (!existsSync(join(ROOT, "public", c.src))) fail(`Ses dosyası eksik: public/${c.src}. Önce: npm run voice -- ${slug}`);
    // the server rebuilds the timeline too; doing it here first catches "narration changed, not voiced" before the wait
    const t = spawnSync("npx", ["tsx", "pipeline/timeline.ts", slug], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
    if (t.status !== 0) fail("Zamanlama kurulamadı (yukarıdaki mesaja bakın).");
  }

  // ---------- 2. commit + push ----------
  console.log("▶ Değişiklikler GitHub'a gönderiliyor…");
  git(["add", "-A"]);
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: ROOT }).status !== 0;
  if (staged) git(["-c", "user.name=LT Video Studio", "-c", "user.email=video-studio@users.noreply.github.com", "commit", "-q", "-m", `Video: ${slug}`]);
  const push = () => spawnSync("git", [...auth, "push", "-q", "origin", `HEAD:${BRANCH}`], { cwd: ROOT, encoding: "utf8" });
  let p = push();
  if (p.status !== 0) {
    // someone else pushed meanwhile (another person on the same repo): replay ours on top and retry once
    const pull = spawnSync("git", [...auth, "-c", "user.name=LT Video Studio", "-c", "user.email=video-studio@users.noreply.github.com", "pull", "-q", "--rebase", "origin", BRANCH], { cwd: ROOT, encoding: "utf8" });
    if (pull.status !== 0) fail(`GitHub'dan güncelleme alınamadı:\n${pull.stderr}`);
    p = push();
    if (p.status !== 0) fail(`GitHub'a gönderilemedi:\n${p.stderr}`);
  }
  const sha = git(["rev-parse", "HEAD"]);

  // ---------- 3. start the render ----------
  // the new run is the one that wasn't there before (compared by id: this computer's clock may be off)
  const runsFor = async () =>
    ((await (await api(`/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&head_sha=${sha}&per_page=20`)).json()) as { workflow_runs: Run[] }).workflow_runs;
  const before = new Set((await runsFor()).map((r) => r.id));
  const started = Date.now();
  await api(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: BRANCH, inputs: { slug, quality, mock: String(mock) } }),
  });
  let run: Run | undefined;
  for (let i = 0; i < 40 && !run; i++) {
    await sleep(3000);
    run = (await runsFor()).find((r) => !before.has(r.id));
  }
  if (!run) return fail("GitHub render işini başlatmadı (2 dakika beklendi).");
  console.log(`▶ Render GitHub'da başladı: ${run.html_url}`);

  // ---------- 4. wait ----------
  let last = "";
  while (run.status !== "completed") {
    await sleep(15000);
    run = (await (await api(`/actions/runs/${run.id}`)).json()) as Run;
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    const state = run.status === "queued" ? "sırada bekliyor" : "render ediliyor";
    if (state !== last || run.status === "in_progress") process.stdout.write(`\r  ${state}… ${mins} dk   `);
    last = state;
  }
  console.log();
  if (run.conclusion !== "success") fail(`Render başarısız oldu (${run.conclusion}). Ayrıntı: ${run.html_url}`);

  // ---------- 5. download ----------
  const arts = (await (await api(`/actions/runs/${run.id}/artifacts`)).json()) as { artifacts: { name: string; archive_download_url: string }[] };
  const art = arts.artifacts.find((a) => a.name === slug);
  if (!art) return fail("Render bitti ama video dosyası bulunamadı.");
  const zip = await api(art.archive_download_url.replace(`https://api.github.com/repos/${repo}`, ""));
  const outDir = join(ROOT, "out");
  mkdirSync(outDir, { recursive: true });
  const zipPath = join(outDir, `${slug}-bulut.zip`);
  writeFileSync(zipPath, Buffer.from(await zip.arrayBuffer()));
  rmSync(join(outDir, file), { force: true });
  // bsdtar reads zip on macOS and Windows; on Windows name it, or Git Bash's GNU tar (no zip) may win
  const tar = process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
  execFileSync(tar, ["-xf", basename(zipPath)], { cwd: outDir });
  rmSync(zipPath, { force: true });
  if (!existsSync(join(outDir, file))) fail(`İndirilen pakette ${file} yok.`);

  // ---------- 6. Desktop ----------
  const desktop = join(homedir(), "Desktop");
  let target = join(desktop, file);
  for (let n = 2; existsSync(target); n++) target = join(desktop, file.replace(/\.mp4$/, ` (${n}).mp4`));
  copyFileSync(join(outDir, file), target);
  console.log(`\n✓ Video masaüstünde: ${target}  (${((Date.now() - started) / 60000).toFixed(1)} dk)`);
}

main().catch((e) => fail(e?.message ?? String(e)));
