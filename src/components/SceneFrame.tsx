import { useLayoutEffect, useRef, useState } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HEIGHT, WIDTH } from "../schema";
import { SAFE } from "../styles";
import { EXIT } from "../timing";

export type Area = { top: number; left: number; w: number; h: number };
export const AREA = { w: WIDTH - SAFE.side * 2, h: HEIGHT - SAFE.top - SAFE.bottom };
const DEFAULT_AREA: Area = { top: SAFE.top, left: SAFE.side, ...AREA };

// Shared entrance/exit + the safe content area every scene draws into.
// Content taller than the area is scaled down so it never runs into the captions.
// plain: no entrance animation (content brings its own, e.g. HyperFrames clips); exit fade only
export const SceneFrame: React.FC<{ durationInFrames: number; area?: Area; soft?: boolean; plain?: boolean; children: React.ReactNode }> = ({
  durationInFrames,
  area = DEFAULT_AREA,
  soft,
  plain,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setFit(h > area.h ? area.h / h : 1);
  }, [area.h]);
  const enter = plain ? 1 : spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const exit = interpolate(frame, [durationInFrames - EXIT, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = soft ? 20 : 60;
  return (
    <div
      style={{
        position: "absolute",
        top: area.top,
        left: area.left,
        width: area.w,
        height: area.h,
        opacity: Math.min(enter, exit),
        transform: `translateY(${(1 - enter) * rise}px) scale(${soft || plain ? 1 : 0.96 + enter * 0.04 + (1 - exit) * 0.03})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div ref={ref} style={{ width: "100%", flex: "0 0 auto", display: "flex", justifyContent: "center", transform: `scale(${fit})` }}>
        {children}
      </div>
    </div>
  );
};
