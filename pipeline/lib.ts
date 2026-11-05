import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Storyboard } from "../src/schema";

export const ROOT = join(import.meta.dirname, "..");
export const PUBLIC = join(ROOT, "public");
export const projectDir = (slug: string) => join(PUBLIC, "projects", slug);
export const projectRel = (slug: string) => `projects/${slug}`; // relative to public/

export const slugArg = (): string => {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run <script> -- <project-slug>");
    process.exit(1);
  }
  return slug;
};

export const loadStoryboard = (slug: string): Storyboard => {
  const file = join(projectDir(slug), "storyboard.json");
  if (!existsSync(file)) throw new Error(`No storyboard at ${file}`);
  const parsed = Storyboard.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error("storyboard.json is invalid:\n" + parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }
  if (parsed.data.slug !== slug) throw new Error(`storyboard slug "${parsed.data.slug}" != folder "${slug}"`);
  const ids = new Set<string>();
  for (const s of parsed.data.scenes) {
    if (ids.has(s.id)) throw new Error(`Duplicate scene id "${s.id}"`);
    ids.add(s.id);
  }
  return parsed.data;
};

export const sayHash = (sb: Storyboard) =>
  createHash("sha1")
    .update(JSON.stringify([sb.voice, sb.scenes.map((s) => s.say)]))
    .digest("hex")
    .slice(0, 12);

export const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));
export const writeJson = (file: string, data: unknown) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};

export const need = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
};

// Split Turkish text into words, keeping punctuation attached to the word
export const splitWords = (text: string) => text.trim().split(/\s+/).filter(Boolean);
