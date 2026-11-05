import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import type { Visual } from "../schema";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "hyperframe" }>;

// A HyperFrames composition, pre-rendered to a transparent WebM at this scene's length (npm run frames).
export const HyperframeVideo: React.FC<{ src: string; width: number | string; height: number | string }> = ({ src, width, height }) => (
  <OffthreadVideo src={staticFile(src)} transparent muted style={{ width, height, display: "block" }} />
);

const Placeholder: React.FC<{ v: V; style: SceneProps<V>["style"]; stale?: boolean; height: number }> = ({ v, style, stale, height }) => (
  <div
    style={{
      width: "100%",
      height,
      border: `4px dashed ${style.muted}`,
      borderRadius: style.radius,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      color: style.muted,
      fontFamily: style.fontMono,
      textAlign: "center",
      padding: 40,
    }}
  >
    <div style={{ fontSize: 34, letterSpacing: 3 }}>HYPERFRAMES · {v.comp}</div>
    <div style={{ fontSize: 26 }}>{stale ? "güncelleniyor…" : "render ediliyor… (npm run frames)"}</div>
  </div>
);

// Scene-area mode: fills the scene box (the size it was rendered at)
export const HyperframeScene: React.FC<SceneProps<V> & { box: { w: number; h: number } }> = ({ v, scene, style, box }) => {
  if (v.area === "full") return null; // drawn over the whole frame by Explainer
  if (!scene.asset) return <Placeholder v={v} style={style} height={box.h} />;
  return (
    <div style={{ position: "relative", width: box.w, height: box.h }}>
      <HyperframeVideo src={scene.asset} width={box.w} height={box.h} />
      {scene.assetFresh === false && (
        <div style={{ position: "absolute", top: 8, right: 8, fontFamily: style.fontMono, fontSize: 20, color: style.muted }}>güncelleniyor…</div>
      )}
    </div>
  );
};

// Full-frame mode: 1080x1920 over the layout, under the captions
export const HyperframeFull: React.FC<{ asset?: string }> = ({ asset }) =>
  asset ? (
    <AbsoluteFill>
      <HyperframeVideo src={asset} width="100%" height="100%" />
    </AbsoluteFill>
  ) : null;
