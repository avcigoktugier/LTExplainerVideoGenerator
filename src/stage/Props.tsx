// Props for legal case diagrams. Base-anchored props are drawn with their base at the bottom of the box.
import type { Style } from "../styles";
import { mix } from "./color";

export const SCALES_SIZE = { w: 640, h: 460 };

export const Scales: React.FC<{ style: Style; tilt: number; left?: string; right?: string }> = ({ style, tilt, left, right }) => {
  const ink = style.ink;
  const beam = mix(ink, style.bg, 0.22);
  const th = (tilt * 12 * Math.PI) / 180;
  const R = 260;
  const pivot = { x: 320, y: 100 };
  const ends = [
    { x: pivot.x - R * Math.cos(th), y: pivot.y - R * Math.sin(th), label: left, fill: style.accent },
    { x: pivot.x + R * Math.cos(th), y: pivot.y + R * Math.sin(th), label: right, fill: style.bg2 },
  ];
  return (
    <svg viewBox={`0 0 ${SCALES_SIZE.w} ${SCALES_SIZE.h}`} width={SCALES_SIZE.w} height={SCALES_SIZE.h} style={{ overflow: "visible" }}>
      <path d="M190 456 Q320 404 450 456 Z" fill={ink} />
      <rect x={309} y={100} width={22} height={344} fill={ink} />
      <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke={beam} strokeWidth={18} strokeLinecap="round" />
      {ends.map((e, i) => (
        <g key={i}>
          <path d={`M${e.x - 82} ${e.y + 132} L${e.x} ${e.y} L${e.x + 82} ${e.y + 132}`} fill="none" stroke={ink} strokeWidth={3.5} />
          <path
            d={`M${e.x - 98} ${e.y + 132} Q${e.x} ${e.y + 222} ${e.x + 98} ${e.y + 132} Z`}
            fill={e.fill}
            stroke={ink}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          {e.label && (
            <text x={e.x} y={e.y + 160} textAnchor="middle" fontFamily={style.fontMono} fontSize={20} letterSpacing={2} fill={ink}>
              {e.label.toLocaleUpperCase("tr-TR")}
            </text>
          )}
        </g>
      ))}
      <circle cx={pivot.x} cy={pivot.y} r={21} fill={style.accent} stroke={ink} strokeWidth={4} />
    </svg>
  );
};

export const Table: React.FC<{ style: Style; w: number }> = ({ style, w }) => (
  <svg viewBox={`0 0 ${w} 210`} width={w} height={210}>
    <rect x={0} y={0} width={w} height={38} rx={6} fill={style.ink} />
    <rect x={26} y={36} width={26} height={174} fill={style.ink} />
    <rect x={w - 52} y={36} width={26} height={174} fill={style.ink} />
  </svg>
);

export const BULLET_SIZE = { w: 120, h: 112 };
export const Bullet: React.FC<{ style: Style; color: string; label?: string }> = ({ style, color, label }) => (
  <div style={{ width: BULLET_SIZE.w, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
    <svg viewBox="0 0 120 48" width={120} height={48}>
      <path d="M8 6 H70 Q104 6 114 24 Q104 42 70 42 H8 Z" fill={color} stroke={style.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={8} y={6} width={14} height={36} fill={style.accent} stroke={style.ink} strokeWidth={4} />
    </svg>
    {label && (
      <div
        style={{
          fontFamily: style.fontMono,
          fontSize: 26,
          color: style.ink,
          background: style.bg2,
          border: `4px solid ${style.ink}`,
          borderRadius: 8,
          padding: "2px 22px",
        }}
      >
        {label}
      </div>
    )}
  </div>
);
