import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "bigNumber" }>;

export const BigNumberScene: React.FC<SceneProps<V>> = ({ v, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = interpolate(frame, [4, 40], [0, v.value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const text = n.toLocaleString("tr-TR", {
    minimumFractionDigits: v.decimals ?? 0,
    maximumFractionDigits: v.decimals ?? 0,
    useGrouping: v.grouping ?? true,
  });
  const ring = spring({ frame, fps, config: { damping: 20 } });
  const label = spring({ frame: frame - 30, fps, config: { damping: 16 } });
  const digits = (v.prefix ?? "").length + text.length + (v.suffix ?? "").length;
  const size = Math.min(300, 1600 / Math.max(3, digits));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            width: 720,
            height: 720,
            borderRadius: "50%",
            border: `6px solid ${style.accent}`,
            opacity: 0.25 * ring,
            transform: `scale(${0.6 + ring * 0.4})`,
          }}
        />
        <div style={{ fontSize: size, fontWeight: 900, letterSpacing: -6, color: style.accent, fontVariantNumeric: "tabular-nums" }}>
          {v.prefix}
          {text}
          {v.suffix}
        </div>
      </div>
      <div
        style={{
          fontSize: 60,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: 860,
          lineHeight: 1.15,
          opacity: label,
          transform: `translateY(${(1 - label) * 30}px)`,
        }}
      >
        {v.label}
      </div>
    </div>
  );
};
