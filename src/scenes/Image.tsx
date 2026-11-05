import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AREA } from "../components/SceneFrame";
import type { Visual } from "../schema";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "image" }>;

export const ImageScene: React.FC<SceneProps<V>> = ({ v, style, scene }) => {
  const frame = useCurrentFrame();
  const p = frame / Math.max(1, scene.durationInFrames);
  const m = v.motion ?? "zoomIn";
  const scale = m === "zoomIn" ? 1 + p * 0.12 : m === "zoomOut" ? 1.12 - p * 0.12 : 1.1;
  const x = m === "panLeft" ? interpolate(p, [0, 1], [3, -3]) : m === "panRight" ? interpolate(p, [0, 1], [-3, 3]) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34, width: "100%" }}>
      <div
        style={{
          height: v.caption ? AREA.h - 150 : AREA.h,
          width: "100%",
          borderRadius: style.radius,
          overflow: "hidden",
          background: style.bg2,
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {scene.asset ? (
          <Img
            src={staticFile(scene.asset)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateX(${x}%)` }}
          />
        ) : (
          <div style={{ color: style.muted, fontSize: 40, padding: 60, textAlign: "center", lineHeight: 1.3 }}>
            Görsel bekleniyor
            <br />
            <span style={{ fontSize: 30 }}>{v.prompt ?? v.file}</span>
          </div>
        )}
      </div>
      {v.caption && <div style={{ fontSize: 56, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>{v.caption}</div>}
    </div>
  );
};
