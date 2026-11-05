import { useCurrentFrame } from "remotion";
import type { Word } from "../schema";
import { SAFE, type Style } from "../styles";

const MAX_WORDS = 4;

// Group words into short phrases; break on punctuation too
export const chunk = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= MAX_WORDS || /[.,!?;:…]$/.test(w.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

export const Captions: React.FC<{ words: Word[]; style: Style; fps: number }> = ({ words, style, fps }) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const chunks = chunk(words);
  const current = chunks.find((c) => t >= c[0].start - 0.05 && t <= c[c.length - 1].end + 0.25);
  if (!current) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.side,
        right: SAFE.side,
        bottom: SAFE.bottom - 180,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 24px",
        fontSize: 58,
        fontWeight: 900,
        lineHeight: 1.15,
        textAlign: "center",
        textShadow: `0 4px 24px ${style.bg}`,
      }}
    >
      {current.map((w, i) => {
        const active = t >= w.start && t < w.end + 0.05;
        return (
          <span
            key={i}
            style={{
              color: active ? style.accent : style.ink,
              transform: `scale(${active ? 1.08 : 1})`,
              display: "inline-block",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
