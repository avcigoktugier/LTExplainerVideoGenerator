// Flat, friendly courtroom-explainer people. Drawn in a 240x320 box, feet at the bottom.
import type { Style } from "../styles";
import { shade } from "./color";

export type Pose = "stand" | "aimLeft" | "aimRight" | "sign" | "raise" | "lying";
export type Mood = "neutral" | "shocked" | "sad" | "happy" | "worried";
export type Hair = "short" | "long" | "bun" | "curly" | "bald" | "headscarf";
export type Outfit = "plain" | "suit" | "dress" | "robe";
export type Accessory = "veil" | "glasses" | "mustache" | "beard";

const MOUTH: Record<Mood, string> = {
  neutral: "M110 113 L130 113",
  happy: "M106 108 Q120 123 134 108",
  sad: "M106 119 Q120 106 134 119",
  worried: "M106 114 Q113 108 120 114 Q127 120 134 114",
  shocked: "",
};

export const PERSON_SIZE = { w: 240, h: 320 };
export const LYING_SIZE = { w: 320, h: 110 };

export const Person: React.FC<{
  style: Style;
  color: string;
  pose?: Pose;
  mood?: Mood;
  look?: "left" | "right" | "front";
  sign?: string;
  hair?: Hair;
  outfit?: Outfit;
  accessories?: Accessory[];
  hairColor?: string;
  frame: number;
  seed?: number;
}> = ({ style, color, pose = "stand", mood = "neutral", look, sign, hair = "short", outfit = "plain", accessories = [], hairColor, frame, seed = 0 }) => {
  const ink = style.outline ?? style.ink;
  const face = style.skin ?? style.bg2;
  const dark = shade(color);
  const sw = 5;

  if (pose === "lying") {
    // Outline-only figure on the ground, the way case diagrams show a victim
    return (
      <svg viewBox={`0 0 ${LYING_SIZE.w} ${LYING_SIZE.h}`} width={LYING_SIZE.w} height={LYING_SIZE.h} style={{ overflow: "visible" }}>
        <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={272} cy={62} r={25} />
          <rect x={122} y={46} width={124} height={34} rx={17} />
          <path d="M124 54 L40 30 M124 72 L28 84" />
          <path d="M214 46 L188 14 L162 18 M214 80 L186 104" />
        </g>
      </svg>
    );
  }

  const aimLeft = pose === "aimLeft";
  const aiming = pose === "aimRight" || aimLeft;
  const facing = aiming ? (aimLeft ? "left" : "right") : look ?? "front";
  const mirror = facing === "left";
  const profile = facing !== "front";
  const blink = (frame + seed * 37) % 104 > 99;
  const breath = Math.sin((frame + seed * 13) / 18) * 2;
  const hairC = hairColor ?? dark;
  const has = (a: Accessory) => accessories.includes(a);
  const dx = profile ? 14 : 0; // face features shift toward the facing side
  const hand = (cx: number, cy: number, r = 10) => <circle cx={cx} cy={cy} r={r} fill={face} stroke={ink} strokeWidth={4} />;

  return (
    <svg viewBox={`0 0 ${PERSON_SIZE.w} ${PERSON_SIZE.h}`} width={PERSON_SIZE.w} height={PERSON_SIZE.h} style={{ overflow: "visible" }}>
      <ellipse cx={120} cy={312} rx={62} ry={8} fill={ink} opacity={0.12} />
      <g transform={mirror ? `translate(${PERSON_SIZE.w} 0) scale(-1 1)` : undefined}>
        {/* legs + feet */}
        <rect x={98} y={226} width={18} height={82} rx={6} fill={dark} />
        <rect x={124} y={226} width={18} height={82} rx={6} fill={dark} />
        <ellipse cx={104} cy={308} rx={16} ry={7} fill={dark} />
        <ellipse cx={136} cy={308} rx={16} ry={7} fill={dark} />

        <g transform={`translate(0 ${breath})`}>
          {/* raised arms go behind the body */}
          {pose === "raise" && (
            <g stroke={color} strokeWidth={22} strokeLinecap="round">
              <line x1={90} y1={150} x2={52} y2={74} />
              <line x1={150} y1={150} x2={188} y2={74} />
            </g>
          )}
          {/* veil and long hair hang behind the body */}
          {has("veil") && (
            <path d="M86 40 Q34 130 52 262 Q86 250 120 256 Q154 250 188 262 Q206 130 154 40 Z" fill={face} stroke={ink} strokeWidth={4} strokeLinejoin="round" opacity={0.95} />
          )}
          {hair === "long" && <path d="M72 78 Q62 150 80 182 L160 182 Q178 150 168 78 Z" fill={hairC} />}
          {hair === "headscarf" && <path d="M64 84 A56 58 0 0 1 176 84 Q182 140 168 168 Q120 186 72 168 Q58 140 64 84 Z" fill={color} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />}

          {/* body */}
          {outfit === "dress" ? (
            <>
              <rect x={84} y={124} width={72} height={90} rx={32} fill={color} />
              <path d="M88 196 L58 282 Q120 296 182 282 L152 196 Z" fill={color} />
              <rect x={86} y={192} width={68} height={10} rx={4} fill={dark} opacity={0.5} />
            </>
          ) : outfit === "robe" ? (
            <>
              <path d="M82 138 Q120 116 158 138 L178 300 Q120 310 62 300 Z" fill={color} />
              <path d="M98 128 L120 176 L142 128 Z" fill={face} />
              <path d="M120 176 L120 300" stroke={dark} strokeWidth={4} opacity={0.6} />
            </>
          ) : (
            <>
              <rect x={76} y={124} width={88} height={118} rx={40} fill={color} />
              <rect x={76} y={204} width={88} height={10} fill={dark} opacity={0.45} />
            </>
          )}
          {outfit === "suit" && (
            <>
              <path d="M100 126 L120 168 L140 126 Z" fill={face} />
              <path d="M120 136 L112 150 L120 192 L128 150 Z" fill={style.accent} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
              <path d="M98 128 L114 176 M142 128 L126 176" stroke={dark} strokeWidth={4} strokeLinecap="round" />
            </>
          )}

          {/* arms / hands */}
          {pose === "stand" && (
            <>
              {hand(70, 214)}
              {hand(170, 214)}
            </>
          )}
          {pose === "raise" && (
            <>
              {hand(50, 70, 12)}
              {hand(190, 70, 12)}
            </>
          )}
          {aiming && (
            <>
              <line x1={140} y1={158} x2={212} y2={152} stroke={color} strokeWidth={24} strokeLinecap="round" />
              <rect x={212} y={138} width={38} height={13} rx={3} fill={ink} />
              <rect x={216} y={146} width={11} height={22} rx={3} fill={ink} />
              {hand(214, 152, 11)}
              {hand(92, 214)}
            </>
          )}
          {pose === "sign" && (
            <>
              <rect x={50} y={150} width={140} height={78} rx={6} fill={ink} />
              {hand(52, 212)}
              {hand(188, 212)}
            </>
          )}

          {/* head */}
          {hair === "bun" && <circle cx={120} cy={30} r={19} fill={hairC} stroke={ink} strokeWidth={sw} />}
          <circle cx={120} cy={80} r={46} fill={face} stroke={ink} strokeWidth={sw} />
          {(hair === "short" || hair === "long" || hair === "bun") && (
            <path d="M75 76 A46 46 0 0 1 165 76 Q148 56 120 55 Q92 56 75 76 Z" fill={hairC} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
          )}
          {hair === "curly" && (
            <g fill={hairC} stroke={ink} strokeWidth={4}>
              {[[82, 62], [98, 44], [120, 38], [142, 44], [158, 62], [168, 82], [72, 82]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={17} />
              ))}
            </g>
          )}
          {hair === "bald" && <path d="M76 92 Q74 74 80 64 M164 92 Q166 74 160 64" stroke={hairC} strokeWidth={9} strokeLinecap="round" fill="none" />}
          {hair === "headscarf" && (
            <path d="M70 90 A50 52 0 0 1 170 90 Q156 58 120 56 Q84 58 70 90 Z" fill={color} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
          )}
          {has("beard") && <path d="M76 92 Q78 134 120 134 Q162 134 164 92 Q150 120 120 122 Q90 120 76 92 Z" fill={hairC} stroke={ink} strokeWidth={3} strokeLinejoin="round" />}
          {has("mustache") && (
            <path transform={`translate(${dx} 0)`} d="M104 108 Q112 99 120 105 Q128 99 136 108 Q128 113 120 109 Q112 113 104 108 Z" fill={hairC} />
          )}

          {profile ? (
            // one big eye on the facing side
            <g>
              <ellipse cx={136} cy={86} rx={15} ry={blink ? 2 : 15} fill={face} stroke={ink} strokeWidth={4} />
              {!blink && <circle cx={141} cy={88} r={6} fill={ink} />}
            </g>
          ) : (
            <g>
              <ellipse cx={104} cy={88} rx={5} ry={blink ? 1 : 5.5} fill={ink} />
              <ellipse cx={136} cy={88} rx={5} ry={blink ? 1 : 5.5} fill={ink} />
              <circle cx={92} cy={104} r={7} fill={style.accent} opacity={0.35} />
              <circle cx={148} cy={104} r={7} fill={style.accent} opacity={0.35} />
            </g>
          )}
          {has("glasses") &&
            (profile ? (
              <circle cx={136} cy={86} r={20} fill="none" stroke={ink} strokeWidth={4} />
            ) : (
              <g fill="none" stroke={ink} strokeWidth={4}>
                <circle cx={104} cy={88} r={14} />
                <circle cx={136} cy={88} r={14} />
                <path d="M118 88 L122 88" />
              </g>
            ))}
          {mood === "shocked" ? (
            <ellipse cx={profile ? 134 : 120} cy={114} rx={7} ry={9} fill={ink} />
          ) : (
            <path
              d={MOUTH[mood]}
              transform={profile ? "translate(14 0)" : undefined}
              fill="none"
              stroke={ink}
              strokeWidth={4}
              strokeLinecap="round"
            />
          )}
        </g>
      </g>
      {/* sign text stays readable (outside the mirror group) */}
      {pose === "sign" && sign && (
        <text
          x={120}
          y={204 + breath}
          textAnchor="middle"
          fontFamily={style.fontSerif}
          fontWeight={700}
          fontSize={sign.length > 3 ? 30 : 46}
          fill={style.accent}
        >
          {sign}
        </text>
      )}
    </svg>
  );
};
