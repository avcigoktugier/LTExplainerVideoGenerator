// Generates narration audio + word timings for a project.
// Usage: npm run voice -- <slug> [--force]
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { parseFile } from "music-metadata";
import type { Storyboard, VoiceResult, Word } from "../src/schema";
import { loadStoryboard, need, projectDir, projectRel, readJson, sayHash, slugArg, splitWords, writeJson } from "./lib";

const GAP = 0.15; // pause between per-scene clips (seconds)

const durationOf = async (file: string) => (await parseFile(file)).format.duration ?? 0;

// Spread a clip's words across its duration, weighted by length (used when the provider gives no timings)
const estimateWords = (text: string, start: number, duration: number): Word[] => {
  const words = splitWords(text);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const speech = Math.max(0.1, duration - 0.15);
  let t = start + 0.05;
  return words.map((w, i) => {
    const d = (weights[i] / total) * speech;
    const word = { text: w, start: t, end: t + d * 0.9 };
    t += d;
    return word;
  });
};

// ---------- ElevenLabs: one take for the whole script, real character timings ----------
async function elevenlabs(sb: Storyboard, dir: string, rel: string): Promise<Omit<VoiceResult, "sayHash">> {
  const key = need("ELEVENLABS_API_KEY");
  const voiceId = sb.voice.voiceId ?? need("ELEVENLABS_VOICE_ID");
  const model = sb.voice.model ?? process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
  const text = sb.scenes.map((s) => s.say.trim()).join(" ");

  const body: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: sb.voice.speed ?? 1.0 },
  };
  // Language enforcement is only accepted by some models
  if (/(turbo|flash|v3)/.test(model)) body.language_code = "tr";

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    audio_base64: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };

  const file = join(dir, "voice.mp3");
  writeFileSync(file, Buffer.from(data.audio_base64, "base64"));
  const total = await durationOf(file);

  // Characters -> words
  let words: Word[] = [];
  const a = data.alignment;
  if (a) {
    let cur: Word | null = null;
    a.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) {
        if (cur) words.push(cur);
        cur = null;
      } else if (!cur) cur = { text: ch, start: a.character_start_times_seconds[i], end: a.character_end_times_seconds[i] };
      else {
        cur.text += ch;
        cur.end = a.character_end_times_seconds[i];
      }
    });
    if (cur) words.push(cur);
  }

  // Scene boundaries by word count; fall back to estimates if counts drift
  const counts = sb.scenes.map((s) => splitWords(s.say).length);
  const expected = counts.reduce((x, y) => x + y, 0);
  if (words.length !== expected) {
    console.warn(`! alignment returned ${words.length} words, script has ${expected}; estimating scene starts`);
    words = estimateWords(text, 0, total);
  }
  const sceneStarts: number[] = [];
  let idx = 0;
  for (const c of counts) {
    sceneStarts.push(idx === 0 ? 0 : Math.max(0, words[idx].start - 0.08));
    idx += c;
  }
  return { provider: "elevenlabs", clips: [{ src: `${rel}/voice.mp3`, start: 0, duration: total }], sceneStarts, words, total };
}

// ---------- Per-scene providers (Google, mock) ----------
async function perScene(
  sb: Storyboard,
  dir: string,
  rel: string,
  synth: (text: string, outBase: string) => Promise<string>, // returns written file name
  provider: string,
): Promise<Omit<VoiceResult, "sayHash">> {
  const clips: VoiceResult["clips"] = [];
  const sceneStarts: number[] = [];
  const words: Word[] = [];
  let t = 0;
  for (const s of sb.scenes) {
    const name = await synth(s.say.trim(), join(dir, `voice-${s.id}`));
    const duration = await durationOf(join(dir, name));
    sceneStarts.push(t);
    clips.push({ src: `${rel}/${name}`, start: t, duration });
    words.push(...estimateWords(s.say, t, duration));
    t += duration + GAP;
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  return { provider, clips, sceneStarts, words, total: t };
}

const googleSynth = (sb: Storyboard) => async (text: string, outBase: string) => {
  const key = need("GOOGLE_TTS_API_KEY");
  const name = sb.voice.voiceId ?? process.env.GOOGLE_TTS_VOICE ?? "tr-TR-Chirp3-HD-Charon";
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "tr-TR", name },
      audioConfig: { audioEncoding: "MP3", speakingRate: sb.voice.speed ?? 1.0, sampleRateHertz: 44100 },
    }),
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
  const { audioContent } = (await res.json()) as { audioContent: string };
  writeFileSync(`${outBase}.mp3`, Buffer.from(audioContent, "base64"));
  return `${basename(outBase)}.mp3`;
};

// Silent WAV sized like real speech, so visuals can be built and reviewed without API keys
const mockSynth = async (text: string, outBase: string) => {
  const seconds = Math.max(1.2, text.length / 14 + 0.3); // ~14 chars/sec for Turkish narration
  const rate = 16000;
  const n = Math.round(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  writeFileSync(`${outBase}.wav`, buf);
  return `${basename(outBase)}.wav`;
};

async function main() {
  const slug = slugArg();
  const force = process.argv.includes("--force");
  const sb = loadStoryboard(slug);
  const dir = projectDir(slug);
  const rel = projectRel(slug);
  mkdirSync(dir, { recursive: true });
  const outFile = join(dir, "voice.json");
  const hash = sayHash(sb);

  const provider = process.argv.includes("--mock") ? "mock" : sb.voice.provider;
  if (!force && existsSync(outFile)) {
    const prev = readJson<VoiceResult>(outFile);
    if (prev.sayHash === hash && prev.provider === provider) {
      console.log("Narration unchanged, keeping existing voice (use --force to regenerate).");
      return;
    }
  }

  console.log(`Voicing ${sb.scenes.length} scenes with ${provider}...`);
  const result =
    provider === "elevenlabs"
      ? await elevenlabs(sb, dir, rel)
      : provider === "google"
        ? await perScene(sb, dir, rel, googleSynth(sb), "google")
        : await perScene(sb, dir, rel, mockSynth, "mock");

  writeJson(outFile, { ...result, sayHash: hash } satisfies VoiceResult);
  console.log(`✓ ${result.total.toFixed(1)}s of narration → ${outFile}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
