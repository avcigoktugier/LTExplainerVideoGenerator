import * as Lucide from "lucide-react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual } from "../schema";
import { beats } from "../timing";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "icons" }>;
type IconCmp = React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
export const getIcon = (name: string): IconCmp =>
  ((Lucide as unknown as Record<string, IconCmp>)[name] ?? Lucide.CircleHelp) as IconCmp;

export const IconsScene: React.FC<SceneProps<V>> = ({ v, style, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = beats(v, scene.durationInFrames);
  const grid = v.items.length > 3;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
      {v.title && <div style={{ fontSize: 72, fontWeight: 900, textAlign: "center", lineHeight: 1.05 }}>{v.title}</div>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: grid ? "1fr 1fr" : "1fr",
          gap: 30,
          width: grid ? "100%" : 760,
        }}
      >
        {v.items.map((it, i) => {
          const s = spring({ frame: frame - at[i], fps, config: { damping: 12, stiffness: 180 } });
          const Icon = getIcon(it.icon);
          return (
            <div
              key={i}
              style={{
                background: style.bg2,
                borderRadius: style.radius,
                padding: grid ? "44px 30px" : "34px 44px",
                display: "flex",
                flexDirection: grid ? "column" : "row",
                alignItems: "center",
                gap: grid ? 22 : 36,
                opacity: s,
                transform: `scale(${0.5 + s * 0.5})`,
              }}
            >
              <Icon size={grid ? 120 : 100} color={style.accent} strokeWidth={2.2} />
              <div style={{ fontSize: grid ? 46 : 54, fontWeight: 700, textAlign: grid ? "center" : "left", lineHeight: 1.1 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
