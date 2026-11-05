// Page for dark styles: drifting glow, slow gold dust and a vignette — the modern stand-in for paper.
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Style } from "../styles";
import { alpha, rng } from "./random";

// Ambient dust: a few dozen soft motes drifting upward, wrapping around. Pure function of the frame.
export const Dust: React.FC<{ color: string; count?: number; seed?: number; opacity?: number }> = ({ color, count = 70, seed = 7, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const motes = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({
      x: r() * width,
      y: r() * height,
      size: 1.2 + r() * 3.2,
      speed: 0.25 + r() * 0.9, // px per frame upward
      sway: 10 + r() * 30,
      phase: r() * Math.PI * 2,
      a: 0.15 + r() * 0.45,
    }));
  }, [count, seed, width, height]);
  useLayoutEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, width, height);
    for (const m of motes) {
      const y = (((m.y - frame * m.speed) % height) + height) % height;
      const x = m.x + Math.sin(frame / 50 + m.phase) * m.sway;
      const twinkle = 0.6 + 0.4 * Math.sin(frame / 23 + m.phase * 3);
      const g = c.createRadialGradient(x, y, 0, x, y, m.size * 4);
      g.addColorStop(0, alpha(color, m.a * twinkle * opacity));
      g.addColorStop(1, alpha(color, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, m.size * 4, 0, Math.PI * 2);
      c.fill();
    }
  }, [frame, motes, color, width, height, opacity]);
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0 }} />;
};

export const DarkPage: React.FC<{ style: Style }> = ({ style }) => {
  const frame = useCurrentFrame();
  const x = 72 + Math.sin(frame / 120) * 10;
  const y = 58 + Math.cos(frame / 140) * 8;
  return (
    <AbsoluteFill style={{ backgroundColor: style.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, ${alpha(style.accent, 0.16)} 0%, transparent 42%), radial-gradient(circle at ${100 - x}% ${y + 22}%, ${alpha(style.accent2, 0.14)} 0%, transparent 46%)`,
        }}
      />
      <Dust color={style.accent} />
      {style.grain && (
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.06, mixBlendMode: "overlay" }}>
          <filter id="dark-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 6} stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#dark-grain)" />
        </svg>
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// Frosted card behind a scene: faint fill, gold hairline, top highlight
export const Glass: React.FC<{ x: number; y: number; w: number; h: number; style: Style; radius?: number }> = ({ x, y, w, h, style, radius = 28 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: radius,
      background: `linear-gradient(160deg, ${alpha("#FFFFFF", 0.07)} 0%, ${alpha("#FFFFFF", 0.02)} 45%, ${alpha(style.accent, 0.04)} 100%)`,
      border: `1.5px solid ${alpha(style.accent, 0.28)}`,
      boxShadow: `inset 0 1px 0 ${alpha("#FFFFFF", 0.12)}, 0 30px 80px rgba(0,0,0,0.45)`,
    }}
  />
);
