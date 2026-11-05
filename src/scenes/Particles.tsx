// "particles": thousands of soft gold sparks (kalem's PixiJS scenes) on a 2D canvas, closed-form per
// frame so any frame renders on its own. burst = explode out of the center on the cue, gather = fly in
// and form the center, rise = embers drifting up the whole scene. Soft additive light, never a flash.
import { useLayoutEffect, useMemo, useRef } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { beats } from "../timing";
import { alpha, hash, rng } from "../fx/random";
import type { Visual } from "../schema";
import { getIcon } from "./Icons";
import { CANVAS } from "./Stage";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "particles" }>;

const DRAG = 0.93;

export const ParticlesScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const frame = useCurrentFrame();
  const { fps: vfps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const effect = v.effect ?? "burst";
  const ctx = { words, from: scene.from, durationInFrames: scene.durationInFrames, fps };
  const t0 = beats(v, scene.durationInFrames, ctx)[0]; // shared with the sound placer
  const count = v.count ?? (effect === "rise" ? 260 : 900);
  const cx = CANVAS.w / 2;
  const cy = CANVAS.h / 2;

  const parts = useMemo(() => {
    const r = rng(hash(scene.id) + count);
    return Array.from({ length: count }, () => {
      const ang = r() * Math.PI * 2;
      const speed = 3 + r() ** 1.6 * 22;
      return {
        ang,
        speed,
        life: 30 + r() * 55,
        size: 0.8 + r() * 2.8,
        white: r() < 0.22,
        // gather/rise start points
        sx: r() * CANVAS.w,
        sy: r() * CANVAS.h,
        ring: 40 + r() * 120,
        delay: r() * 16,
        rise: 0.6 + r() * 1.8,
        phase: r() * Math.PI * 2,
      };
    });
  }, [scene.id, count]);

  useLayoutEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, CANVAS.w, CANVAS.h);
    const dark = !!style.dark;
    // additive light on dark pages; on paper, solid gold and navy flecks (light on light would vanish)
    c.globalCompositeOperation = dark ? "lighter" : "source-over";
    for (const p of parts) {
      let x: number;
      let y: number;
      let a: number;
      if (effect === "burst") {
        const t = frame - t0;
        if (t < 0 || t > p.life) continue;
        const dist = (p.speed * (1 - DRAG ** t)) / (1 - DRAG);
        x = cx + Math.cos(p.ang) * dist;
        y = cy + Math.sin(p.ang) * dist + 0.035 * t * t;
        a = (1 - t / p.life) ** 1.4;
      } else if (effect === "gather") {
        const k = interpolate(frame, [p.delay, t0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
        const tx = cx + Math.cos(p.ang) * p.ring * (1 - k * 0.55);
        const ty = cy + Math.sin(p.ang) * p.ring * 0.6 * (1 - k * 0.55);
        x = p.sx + (tx - p.sx) * k;
        y = p.sy + (ty - p.sy) * k;
        // after arriving, keep orbiting slowly as a halo
        const after = Math.max(0, frame - t0);
        x += Math.cos(p.ang + after / 40) * Math.min(1, after / 20) * 10;
        a = 0.25 + 0.6 * k - Math.min(0.5, after / 120);
      } else {
        const y0 = (((p.sy - frame * p.rise) % (CANVAS.h + 40)) + CANVAS.h + 40) % (CANVAS.h + 40);
        x = p.sx + Math.sin(frame / 30 + p.phase) * 14;
        y = y0 - 20;
        a = 0.35 + 0.35 * Math.sin(frame / 17 + p.phase);
      }
      if (a <= 0.01) continue;
      if (dark) {
        const rad = p.size * 3.2;
        const g = c.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, alpha(p.white ? "#FFF6E0" : style.accent, Math.min(1, a)));
        g.addColorStop(1, alpha(style.accent, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, rad, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = alpha(p.white ? style.ink : style.accent, Math.min(1, a) * 0.85);
        c.beginPath();
        c.arc(x, y, p.size * 1.3, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalCompositeOperation = "source-over";
  }, [frame, parts, effect, t0, cx, cy, style.accent, style.ink, style.dark]);

  // center content: lands with the burst, materialises with the gather, sits there for rise
  const show = effect === "rise" ? spring({ frame: frame - 2, fps: vfps, config: { damping: 16 } }) : spring({ frame: frame - (effect === "burst" ? t0 - 2 : t0 - 8), fps: vfps, config: { damping: 11, stiffness: 150 } });
  const halo = interpolate(frame, [t0 - 4, t0 + 10, t0 + 50], [0, 0.32, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const Icon = v.icon ? getIcon(v.icon) : null;
  const len = v.text?.length ?? 0;
  const size = len > 12 ? 96 : len > 7 ? 130 : 170;
  return (
    <div style={{ position: "relative", width: CANVAS.w, height: CANVAS.h }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${alpha(style.accent, halo)} 0%, transparent 45%)` }} />
      <canvas ref={ref} width={CANVAS.w} height={CANVAS.h} style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          opacity: Math.min(1, show * 1.2),
          scale: String(0.7 + show * 0.3),
        }}
      >
        {Icon && <Icon size={150} color={style.accent} strokeWidth={1.4} />}
        {v.text && (
          <div
            style={{
              fontFamily: style.font,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: -3,
              color: style.ink,
              textShadow: style.dark ? `0 0 40px ${alpha(style.accent, 0.55)}` : `0 6px 30px ${alpha(style.bg, 0.9)}`,
              whiteSpace: "nowrap",
            }}
          >
            {v.text.toLocaleUpperCase("tr-TR")}
          </div>
        )}
        {v.sub && <div style={{ fontFamily: style.fontMono, fontSize: 30, letterSpacing: 5, color: style.dark ? style.accent : style.ink, textShadow: `0 0 12px ${style.bg}, 0 0 24px ${style.bg}` }}>{v.sub.toLocaleUpperCase("tr-TR")}</div>}
      </div>
    </div>
  );
};
