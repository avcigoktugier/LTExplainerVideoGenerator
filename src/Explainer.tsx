import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { DarkPage } from "./fx/DarkPage";
import { alpha } from "./fx/random";
import { DOSSIER, DossierCaptions, DossierChrome } from "./components/Dossier";
import { SceneFrame, type Area } from "./components/SceneFrame";
import { sceneBox } from "./layout";
import { SceneRenderer } from "./scenes";
import { HyperframeFull } from "./scenes/Hyperframe";
import type { Timeline, Transition } from "./schema";
import { getStyle, SAFE } from "./styles";

export type ExplainerProps = { slug: string; timeline?: Timeline };

// "light" transition: a soft gold band sweeps diagonally across the cut (low alpha, no flash)
const LIGHT = 22; // frames
const LightSweep: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, LIGHT], [-0.6, 1.6]);
  const a = interpolate(frame, [0, LIGHT / 2, LIGHT], [0, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "screen",
        background: `linear-gradient(115deg, transparent ${(p - 0.25) * 100}%, ${alpha(color, a)} ${p * 100}%, transparent ${(p + 0.25) * 100}%)`,
      }}
    />
  );
};

const DOSSIER_AREA: Area = { top: DOSSIER.stage.top, left: DOSSIER.side, w: 1080 - DOSSIER.side * 2, h: DOSSIER.stage.height };

export const Explainer: React.FC<ExplainerProps> = ({ slug, timeline }) => {
  if (!timeline) return null;
  const style = getStyle(timeline.style);
  const dossier = timeline.format === "dossier";
  const box = sceneBox(timeline.format);
  const enterOf = (i: number): Transition => timeline.scenes[i]?.transition ?? timeline.transition ?? "fade";

  return (
    <AbsoluteFill lang="tr" style={{ fontFamily: style.font, color: style.ink, backgroundColor: style.bg }}>
      <style>{"*{box-sizing:border-box}"}</style>
      {dossier ? <DossierChrome tl={timeline} style={style} /> : style.dark ? <DarkPage style={style} /> : <Background style={style} />}

      {timeline.scenes.map((s, i) => {
        const hf = s.visual.type === "hyperframe";
        if (hf && s.visual.type === "hyperframe" && s.visual.area === "full") {
          // Whole-frame HyperFrames clip: over the layout, under the captions
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} premountFor={30} name={`${s.id} · hyperframe (full)`}>
              <HyperframeFull asset={s.asset} />
            </Sequence>
          );
        }
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} premountFor={hf ? 30 : 15} name={`${s.id} · ${s.visual.type}`}>
            <SceneFrame
              durationInFrames={s.durationInFrames}
              area={dossier ? DOSSIER_AREA : undefined}
              soft={dossier}
              plain={hf}
              enter={i === 0 ? "fade" : enterOf(i)}
              exit={i === timeline.scenes.length - 1 ? "fade" : enterOf(i + 1)}
            >
              <SceneRenderer scene={s} style={style} slug={slug} words={timeline.words} fps={timeline.fps} box={box} />
            </SceneFrame>
          </Sequence>
        );
      })}

      {timeline.scenes.map((s, i) =>
        i > 0 && enterOf(i) === "light" ? (
          <Sequence key={`light-${s.id}`} from={Math.max(0, s.from - LIGHT / 2)} durationInFrames={LIGHT} name="light sweep">
            <LightSweep color={style.accent} />
          </Sequence>
        ) : null,
      )}

      {dossier ? (
        <DossierCaptions words={timeline.words} style={style} fps={timeline.fps} />
      ) : (
        <Captions words={timeline.words} style={style} fps={timeline.fps} />
      )}

      {timeline.handle && !dossier && (
        <div style={{ position: "absolute", top: SAFE.top - 70, left: SAFE.side, fontSize: 30, fontWeight: 700, color: style.muted, letterSpacing: 1 }}>
          {timeline.handle}
        </div>
      )}

      {timeline.clips.map((c) => (
        <Sequence key={c.src} from={c.from} name="voice">
          <Audio src={staticFile(c.src)} />
        </Sequence>
      ))}
      {timeline.sfx.map((x, i) => (
        <Sequence key={i} from={x.from} durationInFrames={timeline.fps * 3} name="sfx">
          <Audio src={staticFile(x.src)} volume={x.volume} />
        </Sequence>
      ))}
      {timeline.music && <Audio src={staticFile(timeline.music)} volume={0.07} loop />}
    </AbsoluteFill>
  );
};
