// Deterministic Matter.js simulation for `physics` scenes. No DOM: the video draws from it and the
// pipeline reads impact frames from it for sound, so a thud lands on the exact frame a card hits.
import Matter from "matter-js";
import { appearFrame, type CueCtx } from "../cues";
import type { Visual } from "../schema";
import { rng } from "./random";

export const PHYS_CANVAS = { w: 940, h: 720 };
const FLOOR = PHYS_CANVAS.h - 24;

type V = Extract<Visual, { type: "physics" }>;
export type Pose = { x: number; y: number; angle: number };
export type Sim = {
  sizes: { w: number; h: number }[];
  drops: number[]; // frame each item enters
  impacts: { frame: number; strength: number }[]; // first hit of each item (floor or another card)
  frames: (Pose | null)[][]; // [frame][item], null before the item drops
};

export const itemSize = (it: V["items"][number], n: number) => {
  const w = it.w ?? (n > 6 ? 250 : 300);
  return { w, h: it.h ?? (it.icon ? 120 : 96) };
};

export const simulate = (v: V, durationInFrames: number, fps: number, ctx?: CueCtx): Sim => {
  const { Engine, Bodies, Composite, Events, Body } = Matter;
  const engine = Engine.create({ gravity: { x: 0, y: 1.6 } });
  const wall = { isStatic: true, friction: 0.8, restitution: 0.1 };
  Composite.add(engine.world, [
    Bodies.rectangle(PHYS_CANVAS.w / 2, FLOOR + 50, PHYS_CANVAS.w * 2, 100, wall),
    Bodies.rectangle(-50, PHYS_CANVAS.h / 2, 100, PHYS_CANVAS.h * 4, wall),
    Bodies.rectangle(PHYS_CANVAS.w + 50, PHYS_CANVAS.h / 2, 100, PHYS_CANVAS.h * 4, wall),
  ]);

  const r = rng(v.items.length * 7919 + durationInFrames);
  const n = v.items.length;
  const sizes = v.items.map((it) => itemSize(it, n));
  // cue/at wins; otherwise a steady stagger so cards don't land on each other's heads at once
  const drops = v.items.map((it, i) => (it.cue || it.at !== undefined ? appearFrame(ctx, it, i) : 6 + i * Math.max(6, Math.floor((durationInFrames * 0.45) / n))));
  const bodies = v.items.map((_, i) => {
    const { w, h } = sizes[i];
    const cols = n > 5 ? 2 : 1;
    const lane = cols === 1 ? 0.5 : i % 2 ? 0.73 : 0.27;
    const x = Math.min(PHYS_CANVAS.w - w / 2 - 10, Math.max(w / 2 + 10, lane * PHYS_CANVAS.w + (r() - 0.5) * 70));
    const b = Bodies.rectangle(x, -h, w, h, { restitution: 0.12, friction: 0.9, frictionStatic: 1, frictionAir: 0.01, density: 0.002, chamfer: { radius: 14 } });
    Body.setAngle(b, (r() - 0.5) * 0.22);
    Body.setAngularVelocity(b, (r() - 0.5) * 0.01);
    return b;
  });

  const impacts: Sim["impacts"] = v.items.map(() => ({ frame: -1, strength: 0 }));
  let frame = 0;
  Events.on(engine, "collisionStart", (e) => {
    for (const p of e.pairs) {
      for (const b of [p.bodyA, p.bodyB]) {
        const i = bodies.indexOf(b);
        if (i >= 0 && impacts[i].frame < 0) impacts[i] = { frame, strength: Math.min(1, b.speed / 25) };
      }
    }
  });

  const frames: Sim["frames"] = [];
  const added = new Set<number>();
  const sub = 2;
  for (frame = 0; frame < durationInFrames; frame++) {
    drops.forEach((d, i) => {
      if (d <= frame && !added.has(i)) {
        added.add(i);
        Composite.add(engine.world, bodies[i]);
      }
    });
    for (let k = 0; k < sub; k++) Engine.update(engine, 1000 / fps / sub);
    frames.push(bodies.map((b, i) => (added.has(i) ? { x: b.position.x, y: b.position.y, angle: b.angle } : null)));
  }
  Engine.clear(engine);
  return { sizes, drops, impacts: impacts.filter((x) => x.frame >= 0), frames };
};
