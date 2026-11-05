import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Visual, Word } from "../schema";
import type { Style } from "../styles";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "mascot" }>;
type Mood = NonNullable<V["mood"]>;

// An original, code-drawn character. Every part is a shape we can animate:
// idle bob, blinking, lip-flap synced to narration word timings, mood poses.
export const Mascot: React.FC<{ style: Style; mood: Mood; talking: number; frame: number; size?: number }> = ({
  style,
  mood,
  talking,
  frame,
  size = 560,
}) => {
  const c = style.mascot;
  const bob = Math.sin(frame / 9) * 10;
  const blink = frame % 96 > 90 ? 0.1 : 1;
  const eyeRy = (mood === "shocked" ? 62 : 52) * blink;
  const tilt = mood === "curious" ? -7 : 0;
  const look = Math.sin(frame / 40) * 6;
  const wave = mood === "happy" ? Math.sin(frame / 4) * 22 : 0;
  const glow = 0.6 + 0.4 * Math.abs(Math.sin(frame / 12));
  const sw = 10;

  return (
    <svg viewBox="0 0 600 700" width={size} height={(size * 700) / 600} style={{ overflow: "visible" }}>
      <g transform={`translate(0 ${bob}) rotate(${tilt} 300 400)`}>
        {/* antenna */}
        <line x1="300" y1="185" x2="300" y2="105" stroke={c.outline} strokeWidth={sw} strokeLinecap="round" />
        <circle cx="300" cy="92" r="26" fill={style.accent2} stroke={c.outline} strokeWidth={sw} opacity={glow} />
        {/* arms */}
        <rect x="70" y="370" width="90" height="46" rx="23" fill={c.body} stroke={c.outline} strokeWidth={sw} transform={`rotate(${-20 - wave} 150 393)`} />
        <rect x="440" y="370" width="90" height="46" rx="23" fill={c.body} stroke={c.outline} strokeWidth={sw} transform={`rotate(${20 + wave} 450 393)`} />
        {/* feet */}
        <ellipse cx="235" cy="600" rx="55" ry="30" fill={c.body} stroke={c.outline} strokeWidth={sw} />
        <ellipse cx="365" cy="600" rx="55" ry="30" fill={c.body} stroke={c.outline} strokeWidth={sw} />
        {/* body */}
        <rect x="130" y="185" width="340" height="400" rx="165" fill={c.body} stroke={c.outline} strokeWidth={sw} />
        <ellipse cx="300" cy="485" rx="115" ry="80" fill={c.belly} />
        {/* eyes */}
        {[235, 365].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="305" rx="44" ry={eyeRy} fill="#fff" stroke={c.outline} strokeWidth={sw * 0.7} />
            {blink > 0.5 && <circle cx={x + look} cy={mood === "curious" ? 290 : 310} r={mood === "shocked" ? 14 : 20} fill={c.outline} />}
          </g>
        ))}
        {mood === "curious" && <path d="M320 232 Q365 205 410 228" stroke={c.outline} strokeWidth={sw} fill="none" strokeLinecap="round" />}
        {/* mouth */}
        {mood === "shocked" ? (
          <ellipse cx="300" cy="400" rx="26" ry={30 + talking * 8} fill={c.outline} />
        ) : talking > 0.05 ? (
          <ellipse cx="300" cy="395" rx="40" ry={6 + talking * 28} fill={c.outline} />
        ) : (
          <path d="M255 385 Q300 425 345 385" stroke={c.outline} strokeWidth={sw} fill="none" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
};

// 0..1 mouth openness from narration timing
export const talkingAt = (words: Word[], t: number, frame: number) =>
  words.some((w) => t >= w.start && t <= w.end) ? 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.85)) : 0;

export const MascotScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const frame = useCurrentFrame();
  const { fps: f } = useVideoConfig();
  const t = (scene.from + frame) / fps;
  const bubble = spring({ frame: frame - 8, fps: f, config: { damping: 12, stiffness: 170 } });
  const hop = interpolate(spring({ frame, fps: f, config: { damping: 9 } }), [0, 1], [120, 0]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div
        style={{
          position: "relative",
          background: style.bg2,
          color: style.ink,
          borderRadius: style.radius,
          padding: "36px 46px",
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1.12,
          textAlign: "center",
          maxWidth: 900,
          transform: `scale(${bubble})`,
          transformOrigin: "50% 100%",
        }}
      >
        {v.bubble}
        <div
          style={{
            position: "absolute",
            bottom: -34,
            left: "50%",
            marginLeft: -24,
            width: 0,
            height: 0,
            borderLeft: "24px solid transparent",
            borderRight: "24px solid transparent",
            borderTop: `36px solid ${style.bg2}`,
          }}
        />
      </div>
      <div style={{ transform: `translateY(${hop}px)` }}>
        <Mascot style={style} mood={v.mood ?? "happy"} talking={talkingAt(words, t, frame)} frame={frame} size={440} />
      </div>
    </div>
  );
};
