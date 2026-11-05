import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import { trUpper } from "../styles";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "kinetic" }>;
const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");

export const KineticScene: React.FC<SceneProps<V>> = ({ v, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const emph = new Set((v.emphasis ?? []).map(norm));
  const longest = Math.max(...v.lines.map((l) => l.length));
  const size = Math.round(Math.min(150, Math.max(78, 940 / (longest * 0.66))));
  let k = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
      {v.lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.28}px` }}>
          {line.split(" ").map((w, wi) => {
            const delay = 4 + k++ * 3;
            const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 160 } });
            const hot = emph.has(norm(w));
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  fontSize: size,
                  fontWeight: 900,
                  lineHeight: 1.02,
                  letterSpacing: -2,
                  color: hot ? style.bg : style.ink,
                  background: hot ? style.accent : "transparent",
                  padding: hot ? "0 14px" : 0,
                  borderRadius: hot ? 14 : 0,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 50}px) rotate(${(1 - s) * (wi % 2 ? 4 : -4)}deg)`,
                }}
              >
                {trUpper(w)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
