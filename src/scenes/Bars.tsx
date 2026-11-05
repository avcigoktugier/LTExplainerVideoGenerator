import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import { beats } from "../timing";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "bars" }>;

export const BarsScene: React.FC<SceneProps<V>> = ({ v, style, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = beats(v, scene.durationInFrames);
  const max = Math.max(...v.bars.map((b) => b.value));

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 30 }}>
      {v.title && <div style={{ fontSize: 66, fontWeight: 900, textAlign: "center", marginBottom: 24, lineHeight: 1.1 }}>{v.title}</div>}
      {v.bars.map((b, i) => {
        const s = spring({ frame: frame - at[i], fps, config: { damping: 20, stiffness: 90 } });
        const hot = v.highlight === i;
        return (
          <div key={i}>
            <div style={{ fontSize: 42, fontWeight: 700, marginBottom: 10, color: hot ? style.accent : style.ink }}>{b.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  height: 76,
                  width: `${Math.max(2, (b.value / max) * 78 * s)}%`,
                  background: hot ? style.accent : style.muted,
                  borderRadius: 18,
                }}
              />
              <div style={{ fontSize: 46, fontWeight: 900, opacity: s, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(b.value * s).toLocaleString("tr-TR")}
                {v.unit ? ` ${v.unit}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
