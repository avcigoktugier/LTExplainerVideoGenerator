import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { appearFrame } from "../cues";
import type { StageEl, Visual } from "../schema";
import { BULLET_SIZE, Bullet, SCALES_SIZE, Scales, Table } from "../stage/Props";
import { Art, useArts, type ArtData } from "../stage/Art";
import { LYING_SIZE, PERSON_SIZE, Person } from "../stage/Person";
import { resolveColor, trUpper, type Style } from "../styles";
import { getIcon } from "./Icons";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "stage" }>;
export const CANVAS = { w: 940, h: 720 };

type Enter = NonNullable<StageEl["enter"]>;
const DEFAULT_ENTER: Partial<Record<StageEl["kind"], Enter>> = {
  stamp: "drop",
  line: "draw",
  ground: "draw",
  panel: "fade",
  text: "fade",
  table: "fade",
};
// Base-anchored elements sit on (x, y); the rest are centered on it; panels use top-left.
const BASE = new Set<StageEl["kind"]>(["person", "scales", "table", "bullet", "icon", "art"]);

const Element: React.FC<{ el: StageEl; start: number; style: Style; seed: number; arts: Record<string, ArtData> }> = ({ el, start, style, seed, arts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - start;
  if (local < 0) return null;
  const enter: Enter = el.enter ?? DEFAULT_ENTER[el.kind] ?? "pop";
  const stiff = enter === "drop" ? { damping: 13, stiffness: 260 } : { damping: 12, stiffness: 170 };
  const s = enter === "none" ? 1 : spring({ frame: local, fps, config: stiff });
  const draw = interpolate(local, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const fade = interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const ink = style.ink;

  // ---------- lines & ground: SVG over the whole canvas ----------
  if (el.kind === "line" || el.kind === "ground") {
    const [a, b] = el.kind === "ground" ? [[0, el.y], [CANVAS.w, el.y]] : [el.from, el.to];
    const p = enter === "draw" ? draw : 1;
    const color = el.kind === "line" ? resolveColor(style, el.color, ink) : ink;
    return (
      <svg width={CANVAS.w} height={CANVAS.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line
          x1={a[0]}
          y1={a[1]}
          x2={a[0] + (b[0] - a[0]) * p}
          y2={a[1] + (b[1] - a[1]) * p}
          stroke={color}
          strokeWidth={el.kind === "ground" ? 5 : 4}
          strokeDasharray={el.kind === "line" && el.dashed ? "10 12" : undefined}
          strokeLinecap="round"
          opacity={enter === "fade" ? fade : 1}
        />
      </svg>
    );
  }

  // ---------- everything else: positioned HTML box ----------
  let body: React.ReactNode = null;
  let size = { w: 0, h: 0 };
  switch (el.kind) {
    case "person": {
      const lying = el.pose === "lying";
      size = lying ? LYING_SIZE : PERSON_SIZE;
      body = (
        <Person
          style={style}
          color={resolveColor(style, el.color, lying ? style.danger : style.cast[0])}
          pose={el.pose}
          mood={el.mood}
          look={el.look}
          sign={el.sign}
          hair={el.hair}
          outfit={el.outfit}
          accessories={el.accessories}
          hairColor={el.hairColor ? resolveColor(style, el.hairColor, ink) : undefined}
          frame={frame}
          seed={seed}
        />
      );
      break;
    }
    case "art": {
      const a = arts[el.name];
      if (!a) return null;
      const w = el.w ?? (a === "missing" ? 240 : a.w);
      const h = a === "missing" ? w : (w * a.h) / a.w;
      size = { w, h };
      const t = local / fps;
      const idle =
        el.idle === "bob"
          ? `translateY(${Math.sin(t * 3) * 8}px)`
          : el.idle === "sway"
            ? `rotate(${Math.sin(t * 2.2) * 5}deg)`
            : el.idle === "spin"
              ? `rotate(${t * 90}deg)`
              : el.idle === "pulse"
                ? `scale(${1 + Math.sin(t * 4) * 0.04})`
                : "";
      body = (
        <div style={{ transform: `${el.flip ? "scaleX(-1)" : ""} rotate(${el.rotate ?? 0}deg) ${idle}`, transformOrigin: "50% 50%" }}>
          <Art name={el.name} art={a} w={w} h={h} style={style} color={el.color} />
        </div>
      );
      break;
    }
    case "scales": {
      size = SCALES_SIZE;
      const settle = spring({ frame: local - 6, fps, config: { damping: 7, stiffness: 60 } });
      const wob = el.wobble ? Math.sin(local / 12) * 0.3 : 0;
      body = <Scales style={style} tilt={(el.tilt ?? 0) * settle + wob} left={el.left} right={el.right} />;
      break;
    }
    case "table":
      size = { w: el.w ?? 640, h: 210 };
      body = <Table style={style} w={size.w} />;
      break;
    case "bullet":
      size = BULLET_SIZE;
      body = <Bullet style={style} color={resolveColor(style, el.color, style.cast[0])} label={el.label} />;
      break;
    case "icon": {
      const Icon = getIcon(el.name);
      const px = el.size ?? 140;
      size = { w: px, h: px };
      body = <Icon size={px} color={resolveColor(style, el.color, ink)} strokeWidth={1.8} />;
      break;
    }
    case "stamp":
      body = (
        <div
          style={{
            transform: `rotate(${el.rotate ?? -8}deg)`,
            border: `7px double ${style.danger}`,
            borderRadius: 12,
            padding: "10px 30px",
            fontFamily: style.fontMono,
            fontSize: 50,
            letterSpacing: 7,
            color: style.danger,
            background: `${style.bg2}CC`,
            whiteSpace: "nowrap",
          }}
        >
          {trUpper(el.text)}
        </div>
      );
      break;
    case "card": {
      const strikeP = el.strike ? interpolate(local, [12, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
      body = (
        <div
          style={{
            width: el.w ?? 320,
            background: style.bg2,
            border: `5px solid ${ink}`,
            borderRadius: style.radius,
            padding: "22px 20px 26px",
            textAlign: "center",
            opacity: el.dim ? 0.3 : 1,
          }}
        >
          {el.label && <div style={{ fontFamily: style.fontMono, fontSize: 24, letterSpacing: 5, color: style.muted, marginBottom: 6 }}>{trUpper(el.label)}</div>}
          <div style={{ position: "relative", display: "inline-block", fontFamily: style.fontSerif, fontWeight: 700, fontSize: el.value.length > 12 ? 52 : 84, color: el.strike ? style.muted : ink, lineHeight: 1.1 }}>
            {el.value}
            {el.strike && (
              <div style={{ position: "absolute", left: -10, top: "52%", height: 7, borderRadius: 4, width: `calc(${strikeP * 100}% + 20px)`, background: style.danger }} />
            )}
          </div>
        </div>
      );
      break;
    }
    case "tag": {
      const c = resolveColor(style, el.color, ink);
      body = (
        <div
          style={{
            fontFamily: style.fontMono,
            fontSize: 26,
            letterSpacing: 4,
            padding: "8px 22px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            background: el.outline ? style.bg2 : c,
            color: el.outline ? c : style.bg2,
            border: `4px ${el.outline ? "dashed" : "solid"} ${c}`,
          }}
        >
          {trUpper(el.text)}
        </div>
      );
      break;
    }
    case "bubble": {
      const thought = el.variant === "thought";
      const Icon = el.icon ? getIcon(el.icon) : null;
      const tail = el.tail ?? "down";
      body = (
        <div style={{ position: "relative" }}>
          <div
            style={{
              background: style.bg2,
              border: `5px solid ${ink}`,
              borderRadius: thought ? 999 : 22,
              padding: Icon && !el.text ? 22 : "16px 30px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: style.fontSerif,
              fontWeight: 600,
              fontSize: 42,
              color: ink,
              whiteSpace: "nowrap",
            }}
          >
            {Icon && <Icon size={64} color={style.danger} strokeWidth={2.2} />}
            {el.text}
          </div>
          {thought ? (
            <>
              <div style={{ position: "absolute", bottom: -26, [tail === "right" ? "right" : "left"]: 30, width: 22, height: 22, borderRadius: "50%", background: style.bg2, border: `4px solid ${ink}` }} />
              <div style={{ position: "absolute", bottom: -46, [tail === "right" ? "right" : "left"]: 14, width: 13, height: 13, borderRadius: "50%", background: style.bg2, border: `3px solid ${ink}` }} />
            </>
          ) : (
            <svg width={60} height={44} style={{ position: "absolute", bottom: -38, ...(tail === "left" ? { left: 26 } : tail === "right" ? { right: 26 } : { left: "50%", marginLeft: -30 }) }}>
              <path d={tail === "right" ? "M8 0 L52 0 L54 40 Z" : tail === "left" ? "M8 0 L52 0 L6 40 Z" : "M8 0 L52 0 L30 40 Z"} fill={style.bg2} stroke={ink} strokeWidth={5} strokeLinejoin="round" />
              <rect x={10} y={-4} width={40} height={8} fill={style.bg2} />
            </svg>
          )}
        </div>
      );
      break;
    }
    case "badge": {
      const px = el.size ?? 110;
      const fill = el.symbol === "x" ? style.danger : el.symbol === "check" ? style.ink : style.accent;
      const fg = el.symbol === "?" || el.symbol === "!" ? ink : style.bg2;
      const Sym = el.symbol === "x" ? getIcon("X") : el.symbol === "check" ? getIcon("Check") : null;
      body = (
        <div style={{ width: px, height: px, borderRadius: "50%", background: fill, border: `5px solid ${ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Sym ? <Sym size={px * 0.55} color={fg} strokeWidth={3.2} /> : <span style={{ fontFamily: style.fontSerif, fontWeight: 800, fontSize: px * 0.7, color: fg, lineHeight: 1 }}>{el.symbol}</span>}
        </div>
      );
      break;
    }
    case "panel":
      return (
        <div style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, opacity: fade * (enter === "none" ? 1 : 1), background: style.bg2, border: `5px solid ${ink}`, borderRadius: 16, overflow: "hidden" }}>
          {el.ruler &&
            Array.from({ length: Math.floor(el.h / 72) }).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 50 + i * 72, borderTop: `3px solid ${ink}22` }}>
                <span style={{ position: "absolute", left: 12, top: -30, fontFamily: style.fontMono, fontSize: 18, color: style.muted }}>{200 - (i + 1) * 10}</span>
              </div>
            ))}
        </div>
      );
    case "text":
      body = (
        <div
          style={{
            fontFamily: el.font === "mono" ? style.fontMono : el.font === "sans" ? style.font : style.fontSerif,
            fontWeight: el.font === "mono" ? 600 : 700,
            fontSize: el.size ?? 48,
            letterSpacing: el.font === "mono" ? 4 : -0.5,
            color: resolveColor(style, el.color, ink),
            whiteSpace: "nowrap",
          }}
        >
          {el.font === "mono" ? trUpper(el.text) : el.text}
        </div>
      );
      break;
  }

  const base = BASE.has(el.kind) && !(el.kind === "art" && el.anchor === "center");
  let anim = "";
  let opacity = 1;
  if (enter === "pop") {
    anim = `scale(${s})`;
    opacity = Math.min(1, s * 2);
  } else if (enter === "drop") {
    anim = `scale(${1 + (1 - s) * 1.4})`;
    opacity = Math.min(1, s * 1.5);
  } else if (enter === "slideLeft") {
    anim = `translateX(${(1 - s) * 160}px)`;
    opacity = s;
  } else if (enter === "slideRight") {
    anim = `translateX(${-(1 - s) * 160}px)`;
    opacity = s;
  } else if (enter === "fade" || enter === "draw") {
    opacity = fade;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: size.w || undefined,
        height: size.h || undefined,
        transform: `translate(-50%, ${base ? "-100%" : "-50%"}) ${anim} scale(${el.kind === "person" ? el.scale ?? 1 : 1})`,
        transformOrigin: base ? "50% 100%" : "50% 50%",
        opacity,
      }}
    >
      {body}
    </div>
  );
};

export const StageScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const ctx = { words, from: scene.from, durationInFrames: scene.durationInFrames, fps };
  const arts = useArts(v.elements.flatMap((el) => (el.kind === "art" ? [el.name] : [])));
  return (
    <div style={{ position: "relative", width: CANVAS.w, height: CANVAS.h }}>
      {v.elements.map((el, i) => (
        <Element key={i} el={el} start={appearFrame(ctx, el, i)} style={style} seed={i} arts={arts} />
      ))}
    </div>
  );
};
