import { useLayoutEffect, useRef, useState } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { HEIGHT, WIDTH, type Transition } from "../schema";
import { SAFE } from "../styles";
import { EXIT } from "../timing";

export type Area = { top: number; left: number; w: number; h: number };
export const AREA = { w: WIDTH - SAFE.side * 2, h: HEIGHT - SAFE.top - SAFE.bottom };
const DEFAULT_AREA: Area = { top: SAFE.top, left: SAFE.side, ...AREA };

// How a scene moves in (e: 0→1) and out (x: 1→0). Scenes never overlap — cuts stay on the narration —
// so a transition is the outgoing scene's exit followed by the incoming scene's entrance of the same kind.
const motion = (kind: Transition, e: number, x: number, soft: boolean, plain: boolean): React.CSSProperties => {
  const ec = Math.min(1, e);
  switch (kind) {
    case "none":
      return {};
    case "slide":
      return { opacity: Math.min(ec, x), translate: `${(1 - e) * 140 - (1 - x) * 140}px 0` };
    case "wipe":
      return { clipPath: `inset(-10% ${(1 - ec) * 100}% -10% ${(1 - x) * 100}%)` };
    case "zoom":
      return { opacity: Math.min(ec, x), scale: String(1 + (1 - ec) * 0.12 - (1 - x) * 0.08), filter: `blur(${(1 - ec) * 14 + (1 - x) * 10}px)` };
    case "flip":
      return { opacity: Math.min(ec, x) ** 0.5, transform: `perspective(1600px) rotateY(${(1 - e) * -75 + (1 - x) * 75}deg)` };
    case "blur":
      return { opacity: Math.min(ec, x), filter: `blur(${(1 - ec) * 18 + (1 - x) * 18}px)` };
    case "fade":
    case "light": {
      const rise = soft ? 20 : 60;
      return {
        opacity: Math.min(e, x),
        transform: `translateY(${(1 - e) * rise}px) scale(${soft || plain ? 1 : 0.96 + e * 0.04 + (1 - x) * 0.03})`,
      };
    }
  }
};

// Shared entrance/exit + the safe content area every scene draws into.
// Content taller than the area is scaled down so it never runs into the captions.
// plain: no entrance animation (content brings its own, e.g. HyperFrames clips); exit only
export const SceneFrame: React.FC<{
  durationInFrames: number;
  area?: Area;
  soft?: boolean;
  plain?: boolean;
  enter?: Transition; // this scene's entrance
  exit?: Transition; // the next scene's entrance, mirrored on the way out
  children: React.ReactNode;
}> = ({ durationInFrames, area = DEFAULT_AREA, soft, plain, enter = "fade", exit = "fade", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    setFit(h > area.h ? area.h / h : 1);
  }, [area.h]);
  const e = plain || enter === "none" ? 1 : spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const x =
    exit === "none"
      ? 1
      : interpolate(frame, [durationInFrames - EXIT, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  // entrance and exit can be different kinds: the entrance owns the first half, the exit the second
  const late = frame > durationInFrames / 2;
  return (
    <div
      style={{
        position: "absolute",
        top: area.top,
        left: area.left,
        width: area.w,
        height: area.h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...motion(late ? exit : enter, late ? 1 : e, late ? x : 1, !!soft, !!plain),
      }}
    >
      <div ref={ref} style={{ width: "100%", flex: "0 0 auto", display: "flex", justifyContent: "center", transform: `scale(${fit})` }}>
        {children}
      </div>
    </div>
  );
};
