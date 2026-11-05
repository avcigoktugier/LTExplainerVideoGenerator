// "physics": labelled cards drop in on their cues, collide and pile up (kalem's Matter.js scenes).
// The whole simulation runs once per scene (src/fx/physics.ts); each frame just reads its poses.
import { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { alpha } from "../fx/random";
import { PHYS_CANVAS, simulate } from "../fx/physics";
import type { Visual } from "../schema";
import { getIcon } from "./Icons";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "physics" }>;

export const PhysicsScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const frame = useCurrentFrame();
  const sim = useMemo(
    () => simulate(v, scene.durationInFrames, fps, { words, from: scene.from, durationInFrames: scene.durationInFrames, fps }),
    [v, scene.durationInFrames, scene.from, words, fps],
  );
  const poses = sim.frames[Math.min(frame, sim.frames.length - 1)] ?? [];
  const floor = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const dark = !!style.dark;
  return (
    <div style={{ position: "relative", width: PHYS_CANVAS.w, height: PHYS_CANVAS.h, overflow: "hidden" }}>
      {v.title && (
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: style.fontSerif,
            fontWeight: 700,
            fontSize: 58,
            color: style.ink,
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {v.title}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: PHYS_CANVAS.h - 24,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${style.accent}, transparent)`,
          boxShadow: dark ? `0 0 18px ${alpha(style.accent, 0.6)}` : undefined,
          scale: `${floor} 1`,
        }}
      />
      {v.items.map((it, i) => {
        const p = poses[i];
        if (!p) return null;
        const { w, h } = sim.sizes[i];
        const Icon = it.icon ? getIcon(it.icon) : null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - w / 2,
              top: p.y - h / 2,
              width: w,
              height: h,
              rotate: `${p.angle}rad`,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: "0 18px",
              background: dark ? `linear-gradient(160deg, #1B2433 0%, #121925 100%)` : style.bg2,
              border: `2px solid ${alpha(style.accent, dark ? 0.55 : 0.8)}`,
              boxShadow: dark ? `inset 0 1px 0 ${alpha("#FFFFFF", 0.1)}, 0 12px 30px rgba(0,0,0,0.5)` : `0 8px 18px ${alpha(style.ink, 0.15)}`,
              color: style.ink,
              fontFamily: style.font,
              fontWeight: 800,
              fontSize: w < 280 ? 30 : 34,
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {Icon && <Icon size={44} color={style.accent} strokeWidth={1.8} />}
            <span>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
};
