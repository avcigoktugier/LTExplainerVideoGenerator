import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import { beats } from "../timing";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "steps" }>;

export const StepsScene: React.FC<SceneProps<V>> = ({ v, style, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = beats(v, scene.durationInFrames);
  const current = at.reduce((acc, b, i) => (frame >= b ? i : acc), 0);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 34 }}>
      {v.title && <div style={{ fontSize: 70, fontWeight: 900, textAlign: "center", marginBottom: 20 }}>{v.title}</div>}
      {v.steps.map((step, i) => {
        const s = spring({ frame: frame - at[i], fps, config: { damping: 15 } });
        const active = i === current;
        const done = i < current;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              opacity: s * (done ? 0.5 : 1),
              transform: `translateX(${(1 - s) * 80}px) scale(${active ? 1.03 : 1})`,
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: active ? style.accent : style.bg2,
                color: active ? style.bg : style.ink,
                fontSize: 56,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{step}</div>
          </div>
        );
      })}
    </div>
  );
};
