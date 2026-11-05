// "Dossier" format — Law Trust house look: a navy masthead block (brand, case number, segmented
// chapter progress, § chapter label, headline with an underlined accent word), a clean paper stage
// framed by corner marks, a § source tag and box-free captions with a marker-pen highlight.
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DOSSIER_SIDE, DOSSIER_STAGE } from "../layout";
import type { Timeline, TimelineScene, Word } from "../schema";
import { trUpper, type Style } from "../styles";
import { chunk } from "./Captions";
import { DarkPage, Glass } from "../fx/DarkPage";
import { alpha } from "../fx/random";

// Masthead colors; dark styles set their own, light ones invert ink/bg
const bandBg = (s: Style) => s.band ?? s.ink;
const onBand = (s: Style) => s.onBand ?? s.bg;

// Vertical layout (1080x1920). The stage area is where scene visuals render.
export const DOSSIER = {
  side: DOSSIER_SIDE,
  headerY: 228,
  progressY: 300,
  kickerY: 350,
  headlineY: 392,
  bandBottom: 612,
  stage: DOSSIER_STAGE,
  sourceY: 1384,
  captionY: 1452,
};

type Group = { key: string; from: number; to: number; scene: TimelineScene };

// Consecutive scenes sharing the same value form one group
const groupBy = (scenes: TimelineScene[], keyOf: (s: TimelineScene) => string): Group[] => {
  const out: Group[] = [];
  for (const s of scenes) {
    const key = keyOf(s);
    const last = out.at(-1);
    if (last && last.key === key) last.to = s.from + s.durationInFrames;
    else out.push({ key, from: s.from, to: s.from + s.durationInFrames, scene: s });
  }
  return out;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const Paper: React.FC<{ style: Style }> = ({ style }) => style.dark ? <DarkPage style={style} /> : (
  <AbsoluteFill style={{ backgroundColor: style.bg }}>
    {/* soft dot texture instead of a grid */}
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${style.ink}14 1.6px, transparent 1.8px)`,
        backgroundSize: "36px 36px",
        backgroundPosition: "18px 18px",
        opacity: style.grid ? 1 : 0,
      }}
    />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 60%, transparent 55%, ${style.ink}10 100%)` }} />
  </AbsoluteFill>
);

// Navy masthead block with a brass edge and the brand mark, faint, on the right
const Band: React.FC<{ style: Style; watermark?: string }> = ({ style, watermark }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: DOSSIER.bandBottom,
      // dark: a translucent masthead over the glowing page, so the page reads as one surface
      background: style.dark ? `linear-gradient(180deg, ${alpha(bandBg(style), 0.95)} 0%, ${alpha(bandBg(style), 0.55)} 100%)` : bandBg(style),
      overflow: "hidden",
    }}
  >
    {watermark && (
      <Img
        src={staticFile(`brand/${watermark}`)}
        style={{ position: "absolute", right: -70, top: 150, height: 420, width: "auto", opacity: 0.06 }}
      />
    )}
    {style.dark ? (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${style.accent} 30%, ${style.accent} 70%, transparent 100%)`,
          boxShadow: `0 0 24px ${alpha(style.accent, 0.7)}`,
        }}
      />
    ) : (
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: style.accent }} />
    )}
  </div>
);

const Header: React.FC<{ tl: Timeline; style: Style }> = ({ tl, style }) => {
  const brand = tl.brand;
  return (
    <div
      style={{
        position: "absolute",
        top: DOSSIER.headerY - 34,
        left: DOSSIER.side,
        right: DOSSIER.side,
        height: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {brand?.logo ? (
        // the firm's logo carries its own wordmark
        <Img src={staticFile(`brand/${brand.logo}`)} style={{ height: 92, width: "auto", objectFit: "contain" }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 60,
              height: 60,
              border: `3px solid ${style.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: style.fontSerif,
              fontSize: 40,
              fontWeight: 700,
              color: style.accent,
              transform: "rotate(45deg)",
            }}
          >
            <span style={{ transform: "rotate(-45deg)" }}>§</span>
          </div>
          <div style={{ fontFamily: style.fontSerif, fontWeight: 700, fontSize: 36, letterSpacing: 1, color: onBand(style) }}>
            {brand?.name ?? tl.title}
          </div>
        </div>
      )}
      {brand?.series && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: style.fontMono, fontSize: 22, letterSpacing: 4, color: onBand(style), opacity: 0.6 }}>{trUpper(brand.series)}</span>
          <span style={{ fontFamily: style.fontSerif, fontWeight: 700, fontSize: 46, color: style.accent }}>
            {String(tl.episode ?? 1).padStart(3, "0")}
          </span>
        </div>
      )}
    </div>
  );
};

// Story-style segmented bar: one segment per chapter, the current one fills as it plays
const Progress: React.FC<{ chapters: Group[]; style: Style }> = ({ chapters, style }) => {
  const frame = useCurrentFrame();
  const n = chapters.length;
  if (n < 2) return null;
  const cur = Math.max(0, chapters.findIndex((c) => frame >= c.from && frame < c.to));
  const p = interpolate(frame, [chapters[cur].from, chapters[cur].to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: DOSSIER.progressY - 3, left: DOSSIER.side, right: DOSSIER.side, height: 6, display: "flex", gap: 10 }}>
      {chapters.map((_, i) => (
        <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: `${onBand(style)}33`, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(i < cur ? 1 : i === cur ? p : 0) * 100}%`, background: i === cur ? style.accent : onBand(style) }} />
        </div>
      ))}
    </div>
  );
};

// "Söz yetmez, *dava* gerekir." → words made of styled pieces ("*mahkeme*." stays one word)
type Piece = { text: string; accent: boolean };
const parseHeadline = (h: string): Piece[][] => {
  const words: Piece[][] = [];
  let accent = false;
  for (const token of h.trim().split(/\s+/)) {
    const pieces: Piece[] = [];
    for (const part of token.split(/(\*)/)) {
      if (part === "*") accent = !accent;
      else if (part) pieces.push({ text: part, accent });
    }
    if (pieces.length) words.push(pieces);
  }
  return words;
};

const Headline: React.FC<{ text: string; style: Style }> = ({ text, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = parseHeadline(text);
  const len = text.replace(/\*/g, "").length;
  const size = len > 44 ? 64 : len > 28 ? 78 : 92;
  const lastWord = words.length - 1;
  // underline under accent words draws in once the headline has landed
  const line = interpolate(frame, [8 + lastWord * 2, 20 + lastWord * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: DOSSIER.headlineY,
        left: DOSSIER.side,
        right: DOSSIER.side + 20,
        display: "flex",
        flexWrap: "wrap",
        gap: `0 ${size * 0.24}px`,
        fontFamily: style.fontSerif,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -1.5,
        color: onBand(style),
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - 3 - i * 2, fps, config: { damping: 18, stiffness: 140 } });
        return (
          <span key={i} style={{ display: "inline-block", opacity: s, transform: `translateX(${(1 - s) * -24}px)` }}>
            {w.map((p, j) =>
              p.accent ? (
                <span key={j} style={{ position: "relative", display: "inline-block", color: style.accent }}>
                  {p.text}
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: size * 0.02,
                      height: size * 0.08,
                      background: style.accent,
                      transformOrigin: "left center",
                      transform: `scaleX(${line})`,
                    }}
                  />
                </span>
              ) : (
                <span key={j}>{p.text}</span>
              ),
            )}
          </span>
        );
      })}
    </div>
  );
};

const Kicker: React.FC<{ text: string; index: number; style: Style }> = ({ text, index, style }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: DOSSIER.kickerY - 16,
        left: DOSSIER.side,
        right: DOSSIER.side,
        fontFamily: style.fontMono,
        fontSize: 25,
        letterSpacing: 5,
        opacity: o,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span style={{ color: style.accent }}>§ {pad2(index + 1)}</span>
      <span style={{ color: onBand(style), opacity: 0.45 }}> — </span>
      <span style={{ color: onBand(style), opacity: 0.85 }}>{trUpper(text)}</span>
    </div>
  );
};

// Corner marks framing the stage
const Frame: React.FC<{ style: Style }> = ({ style }) => {
  if (style.dark) {
    const pad = 26;
    return <Glass x={DOSSIER.side - pad} y={DOSSIER.stage.top + 6} w={1080 - (DOSSIER.side - pad) * 2} h={DOSSIER.stage.height - 12} style={style} />;
  }
  const x0 = DOSSIER.side - 26;
  const x1 = 1080 - DOSSIER.side + 26;
  const y0 = DOSSIER.stage.top + 6;
  const y1 = DOSSIER.stage.top + DOSSIER.stage.height - 6;
  const L = 34;
  const d = [
    `M${x0} ${y0 + L}V${y0}H${x0 + L}`,
    `M${x1 - L} ${y0}H${x1}V${y0 + L}`,
    `M${x0} ${y1 - L}V${y1}H${x0 + L}`,
    `M${x1 - L} ${y1}H${x1}V${y1 - L}`,
  ].join("");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <path d={d} fill="none" stroke={style.ink} strokeOpacity={0.28} strokeWidth={3} />
    </svg>
  );
};

const Source: React.FC<{ text: string; style: Style }> = ({ text, style }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(frame, [4, 14], [-16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: DOSSIER.sourceY, left: DOSSIER.side, right: DOSSIER.side, display: "flex", opacity: o, transform: `translateX(${x}px)` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderLeft: `6px solid ${style.accent}`,
          background: `${style.ink}0D`,
          padding: "8px 18px 8px 14px",
          fontFamily: style.fontMono,
          fontSize: 22,
          letterSpacing: 2.5,
          color: style.ink,
          opacity: 0.85,
        }}
      >
        {trUpper(text)}
      </div>
    </div>
  );
};

const CaptionBar: React.FC<{ words: Word[]; style: Style; fps: number }> = ({ words, style, fps }) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const current = chunk(words).find((c) => t >= c[0].start - 0.05 && t <= c[c.length - 1].end + 0.3);
  if (!current) return null;
  return (
    <div style={{ position: "absolute", top: DOSSIER.captionY, left: DOSSIER.side - 20, right: DOSSIER.side - 20, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "4px 14px",
          fontFamily: style.font,
          fontWeight: 800,
          fontSize: 56,
          lineHeight: 1.15,
          letterSpacing: -0.5,
        }}
      >
        {current.map((w, i) => {
          const said = t >= w.start;
          const now = said && t < w.end + 0.05;
          const mark = now ? interpolate(t, [w.start, w.start + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
          if (style.dark)
            return (
              <span
                key={i}
                style={{
                  color: now ? style.bg : style.ink,
                  opacity: said ? 1 : 0.32,
                  padding: "0 12px",
                  borderRadius: 12,
                  background: now ? alpha(style.accent, mark) : "transparent",
                  boxShadow: now ? `0 0 ${28 * mark}px ${alpha(style.accent, 0.45 * mark)}` : "none",
                }}
              >
                {w.text}
              </span>
            );
          return (
            <span
              key={i}
              style={{
                color: style.ink,
                opacity: said ? 1 : 0.28,
                padding: "0 6px",
                backgroundImage: `linear-gradient(${style.accent}, ${style.accent})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 82%",
                backgroundSize: `${mark * 100}% 42%`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const DossierChrome: React.FC<{ tl: Timeline; style: Style }> = ({ tl, style }) => {
  const chapters = groupBy(tl.scenes, (s) => s.chapter ?? s.headline ?? s.id);
  const headlines = groupBy(tl.scenes, (s) => s.headline ?? "");
  const kickers = groupBy(tl.scenes, (s) => s.chapter ?? "");
  const last = tl.scenes.at(-1)!;
  const sources = groupBy(tl.scenes, (s) => s.source ?? (s === last ? tl.brand?.disclaimer ?? "" : ""));
  const chapterIndex = (from: number) => Math.max(0, chapters.findIndex((c) => from >= c.from && from < c.to));
  return (
    <>
      <Paper style={style} />
      <Band style={style} watermark={tl.brand?.watermark} />
      <Header tl={tl} style={style} />
      <Progress chapters={chapters} style={style} />
      {kickers.map((g) => g.key && (
        <Sequence key={`k${g.from}`} from={g.from} durationInFrames={g.to - g.from} name="kicker">
          <Kicker text={g.key} index={chapterIndex(g.from)} style={style} />
        </Sequence>
      ))}
      {headlines.map((g) => g.key && (
        <Sequence key={`h${g.from}`} from={g.from} durationInFrames={g.to - g.from} name="headline">
          <Headline text={g.key} style={style} />
        </Sequence>
      ))}
      <Frame style={style} />
      {sources.map((g) => g.key && (
        <Sequence key={`s${g.from}`} from={g.from} durationInFrames={g.to - g.from} name="source">
          <Source text={g.key} style={style} />
        </Sequence>
      ))}
    </>
  );
};

export const DossierCaptions = CaptionBar;
