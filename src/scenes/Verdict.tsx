import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import { trUpper } from "../styles";
import { beats } from "../timing";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "verdict" }>;

// "Kasten öldürme" gets struck through, then the actual legal result lands.
export const VerdictScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const frame = useCurrentFrame();
  const { fps: f } = useVideoConfig();
  const [, strikeAt, toAt] = beats(v, scene.durationInFrames, { words, from: scene.from, durationInFrames: scene.durationInFrames, fps });
  const strike = interpolate(frame, [strikeAt, strikeAt + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const to = spring({ frame: frame - toAt, fps: f, config: { damping: 12, stiffness: 160 } });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46, width: "100%" }}>
      <div
        style={{
          width: 820,
          background: style.bg2,
          border: `5px solid ${style.ink}`,
          borderRadius: style.radius,
          padding: "34px 30px 46px",
          textAlign: "center",
        }}
      >
        {v.label && <div style={{ fontFamily: style.fontMono, fontSize: 26, letterSpacing: 6, color: style.muted, marginBottom: 14 }}>{trUpper(v.label)}</div>}
        <div style={{ position: "relative", display: "inline-block", fontFamily: style.fontSerif, fontWeight: 700, fontSize: 78, color: strike > 0.5 ? style.muted : style.ink }}>
          {v.from}
          <div style={{ position: "absolute", left: -14, top: "54%", height: 9, borderRadius: 5, width: `calc(${strike * 100}% + 28px)`, background: style.danger }} />
        </div>
      </div>
      {v.to && (
        <div
          style={{
            fontFamily: style.fontSerif,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 120,
            color: style.accent,
            opacity: to,
            transform: `translateY(${(1 - to) * 40}px) scale(${0.9 + to * 0.1})`,
          }}
        >
          {v.to}
        </div>
      )}
    </div>
  );
};
