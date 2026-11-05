import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import { beats } from "../timing";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "compare" }>;

export const CompareScene: React.FC<SceneProps<V>> = ({ v, style, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b] = beats(v, scene.durationInFrames);

  const Card = ({ side, start, tone }: { side: V["left"]; start: number; tone: string }) => {
    const s = spring({ frame: frame - start, fps, config: { damping: 15 } });
    return (
      <div
        style={{
          width: "100%",
          background: style.bg2,
          borderRadius: style.radius,
          borderLeft: `14px solid ${tone}`,
          padding: "36px 44px",
          opacity: s,
          transform: `translateX(${(1 - s) * (start === a ? -120 : 120)}px)`,
        }}
      >
        <div style={{ fontSize: 60, fontWeight: 900, color: tone, marginBottom: 16 }}>{side.title}</div>
        {side.items.map((it, i) => (
          <div key={i} style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.35 }}>
            • {it}
          </div>
        ))}
      </div>
    );
  };

  const vs = spring({ frame: frame - b + 4, fps, config: { damping: 10 } });
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <Card side={v.left} start={a} tone={style.muted} />
      <div
        style={{
          fontSize: 50,
          fontWeight: 900,
          background: style.accent,
          color: style.bg,
          borderRadius: 999,
          padding: "10px 34px",
          transform: `scale(${vs})`,
        }}
      >
        VS
      </div>
      <Card side={v.right} start={b} tone={style.accent} />
    </div>
  );
};
