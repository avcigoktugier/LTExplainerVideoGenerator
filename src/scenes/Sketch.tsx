// "sketch": line art that draws itself stroke by stroke (kalem's Paper.js scenes, in the modern look:
// clean strokes with a soft glow instead of trembling ink on paper). Strokes land on cue words.
import { useLayoutEffect, useRef } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { alpha, rng } from "../fx/random";
import type { SketchStroke, Visual } from "../schema";
import { resolveColor, type Style } from "../styles";
import { getIcon } from "./Icons";
import { SKETCH_DUR, sketchStarts } from "../timing";
import { CANVAS } from "./Stage";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "sketch" }>;

const SHAPES = "path,circle,rect,line,polyline,polygon,ellipse";

// A ring drawn by hand: a bit more than one turn, slightly uneven, slightly flattened
const ringPath = (x: number, y: number, r: number, seed: number) => {
  const rand = rng(seed);
  const ph = rand() * Math.PI * 2;
  const pts: string[] = [];
  const a0 = -0.35 + rand() * 0.2;
  const a1 = Math.PI * 2 + 0.45;
  for (let i = 0; i <= 48; i++) {
    const a = a0 + ((a1 - a0) * i) / 48;
    const rr = r * (1 + 0.045 * Math.sin(3 * a + ph) + (0.06 * i) / 48);
    pts.push(`${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr * 0.86).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
};

const arrowPath = (from: [number, number], to: [number, number], bend = 0.25) => {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend * 0.5;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend * 0.5;
  // arrowhead along the curve's end tangent
  const ang = Math.atan2(y2 - my, x2 - mx);
  const L = 26;
  const h1 = [x2 - L * Math.cos(ang - 0.45), y2 - L * Math.sin(ang - 0.45)];
  const h2 = [x2 - L * Math.cos(ang + 0.45), y2 - L * Math.sin(ang + 0.45)];
  return { body: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, head: `M${h1[0]} ${h1[1]} L${x2} ${y2} L${h2[0]} ${h2[1]}` };
};

const underlinePath = (x: number, y: number, w: number) =>
  `M${x} ${y + 3} C${x + w * 0.3} ${y - 5}, ${x + w * 0.6} ${y + 7}, ${x + w} ${y - 2}`;

// One stroked SVG path drawn from 0 → p
const Line: React.FC<{ d: string; p: number; color: string; width: number }> = ({ d, p, color, width }) =>
  p <= 0 ? null : (
    <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
  );

// A Lucide icon whose own shapes draw in (pathLength set on each child shape)
const DrawnIcon: React.FC<{ name: string; x: number; y: number; size: number; color: string; p: number }> = ({ name, x, y, size, color, p }) => {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = getIcon(name);
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<SVGGeometryElement>(SHAPES).forEach((el) => {
      el.setAttribute("pathLength", "1");
      el.style.strokeDasharray = "1 1";
      el.style.strokeDashoffset = String(1 - p);
    });
  }, [p, name]);
  if (p <= 0) return null;
  return (
    <div ref={ref} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <Icon size={size} color={color} strokeWidth={1.4} />
    </div>
  );
};

const StrokeEl: React.FC<{ st: SketchStroke; start: number; style: Style; seed: number }> = ({ st, start, style, seed }) => {
  const frame = useCurrentFrame();
  const dur = Math.max(4, Math.round((st.dur ?? SKETCH_DUR[st.kind]) * 30));
  const p = interpolate(frame - start, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const accent = (c?: string) => resolveColor(style, c, style.accent);
  const ink = (c?: string) => resolveColor(style, c, style.ink);

  switch (st.kind) {
    case "path":
      return (
        <svg width={CANVAS.w} height={CANVAS.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Line d={st.d} p={p} color={ink(st.color)} width={st.width ?? 5} />
        </svg>
      );
    case "circle":
      return (
        <svg width={CANVAS.w} height={CANVAS.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Line d={ringPath(st.x, st.y, st.r, seed + 11)} p={p} color={accent(st.color)} width={6} />
        </svg>
      );
    case "underline":
      return (
        <svg width={CANVAS.w} height={CANVAS.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Line d={underlinePath(st.x, st.y, st.w)} p={p} color={accent(st.color)} width={7} />
        </svg>
      );
    case "arrow": {
      const a = arrowPath(st.from, st.to, st.bend);
      return (
        <svg width={CANVAS.w} height={CANVAS.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Line d={a.body} p={Math.min(1, p / 0.8)} color={accent(st.color)} width={6} />
          <Line d={a.head} p={(p - 0.8) / 0.2} color={accent(st.color)} width={6} />
        </svg>
      );
    }
    case "icon":
      return <DrawnIcon name={st.name} x={st.x} y={st.y} size={st.size ?? 180} color={accent(st.color)} p={p} />;
    case "text": {
      const size = st.size ?? 64;
      const font = st.font === "mono" ? style.fontMono : st.font === "sans" ? style.font : style.fontSerif;
      return (
        <div
          style={{
            position: "absolute",
            left: st.x,
            top: st.y,
            translate: "-50% -50%",
            whiteSpace: "nowrap",
            fontFamily: font,
            fontWeight: st.font === "sans" ? 800 : 700,
            fontSize: size,
            letterSpacing: st.font === "mono" ? 3 : -0.5,
            color: ink(st.color),
            clipPath: `inset(-20% ${(1 - p) * 100}% -20% -2%)`,
            filter: `blur(${(1 - p) * 3}px)`,
          }}
        >
          {st.text}
        </div>
      );
    }
  }
};

export const SketchScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const ctx = { words, from: scene.from, durationInFrames: scene.durationInFrames, fps };
  const glow = v.glow ?? !!style.dark;
  const starts = sketchStarts(v, ctx);
  return (
    <div
      style={{
        position: "relative",
        width: CANVAS.w,
        height: CANVAS.h,
        filter: glow ? `drop-shadow(0 0 10px ${alpha(style.accent, 0.55)}) drop-shadow(0 0 2px ${alpha(style.accent, 0.4)})` : undefined,
      }}
    >
      {v.strokes.map((st, i) => (
        <StrokeEl key={i} st={st} start={starts[i]} style={style} seed={i} />
      ))}
    </div>
  );
};
