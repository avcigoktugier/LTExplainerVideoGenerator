// Generates on-brand illustrations for `image` scenes that have a prompt but no file yet.
// Usage: npm run images -- <slug> [--force]
// Consistent character: put a reference drawing at public/brand/character.png and set
// "useCharacter": true on the scene — it is sent along with the prompt every time.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getStyle } from "../src/styles";
import { loadStoryboard, need, projectDir, PUBLIC, slugArg } from "./lib";

async function main() {
  const slug = slugArg();
  const force = process.argv.includes("--force");
  const sb = loadStoryboard(slug);
  const key = need("GEMINI_API_KEY");
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const style = getStyle(sb.style);
  const imgDir = join(projectDir(slug), "img");
  mkdirSync(imgDir, { recursive: true });
  const charRef = join(PUBLIC, "brand", "character.png");

  for (const s of sb.scenes) {
    if (s.visual.type !== "image" || !s.visual.prompt) continue;
    const name = s.visual.file ?? `${s.id}.png`;
    const out = join(imgDir, name);
    if (existsSync(out) && !force) {
      console.log(`- ${s.id}: ${name} exists`);
      continue;
    }
    const parts: unknown[] = [{ text: `${s.visual.prompt}. Style: ${style.imagePrompt}. Vertical 9:16 composition.` }];
    if (s.visual.useCharacter) {
      if (!existsSync(charRef)) throw new Error(`${s.id}: useCharacter set but public/brand/character.png is missing`);
      parts.unshift({ text: "Use this exact character design (same proportions, colors, face) in the new scene:" }, {
        inlineData: { mimeType: "image/png", data: readFileSync(charRef).toString("base64") },
      });
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16" } },
      }),
    });
    if (!res.ok) throw new Error(`${s.id}: Gemini ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data: string } }[] } }[] };
    const img = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!img) throw new Error(`${s.id}: no image returned (prompt may have been blocked)`);
    writeFileSync(out, Buffer.from(img, "base64"));
    console.log(`✓ ${s.id} → img/${name}`);
    if (!s.visual.file) console.log(`  (add "file": "${name}" to scene ${s.id}, or leave it — ${s.id}.png is the default)`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
