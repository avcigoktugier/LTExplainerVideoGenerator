import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Style } from "../styles";

export const Background: React.FC<{ style: Style }> = ({ style }) => {
  const frame = useCurrentFrame();
  // Slow drifting glow keeps static frames from feeling dead
  const x = 50 + Math.sin(frame / 90) * 18;
  const y = 35 + Math.cos(frame / 110) * 10;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, ${style.accent2}22 0%, transparent 45%), radial-gradient(circle at ${100 - x}% ${y + 45}%, ${style.accent}18 0%, transparent 40%)`,
        }}
      />
      {style.grain && (
        <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.08, mixBlendMode: "overlay" }}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 6} stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
