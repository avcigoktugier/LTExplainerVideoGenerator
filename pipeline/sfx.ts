// Generates the house SFX pack with ElevenLabs Sound Effects (one-time, ~9 short files).
// Usage: npm run sfx            (skips files that already exist)
//        npm run sfx -- --force
// You can also drop your own .mp3 files into public/sfx with the same names.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { need, PUBLIC } from "./lib";

const PACK: Record<string, { text: string; seconds: number }> = {
  whoosh: { text: "fast clean whoosh transition, short, modern motion graphics, no reverb tail", seconds: 0.7 },
  swoosh: { text: "soft airy swoosh, subtle UI transition", seconds: 0.6 },
  pop: { text: "short bubbly pop, playful UI element appearing", seconds: 0.5 },
  click: { text: "crisp single mouse click, dry", seconds: 0.5 },
  tick: { text: "tiny wooden tick, very short, clean", seconds: 0.5 },
  riser: { text: "short tension riser into a soft impact, cinematic, clean", seconds: 1.5 },
  boing: { text: "cute cartoon spring boing, short", seconds: 0.6 },
  ding: { text: "bright positive notification ding", seconds: 0.8 },
  thud: { text: "deep soft cinematic thud impact", seconds: 0.8 },
};

async function main() {
  const key = need("ELEVENLABS_API_KEY");
  const force = process.argv.includes("--force");
  const dir = join(PUBLIC, "sfx");
  mkdirSync(dir, { recursive: true });
  for (const [name, p] of Object.entries(PACK)) {
    const file = join(dir, `${name}.mp3`);
    if (existsSync(file) && !force) {
      console.log(`- ${name} exists`);
      continue;
    }
    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: p.text, duration_seconds: p.seconds, prompt_influence: 0.6 }),
    });
    if (!res.ok) throw new Error(`${name}: ElevenLabs ${res.status} ${await res.text()}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${name}`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
