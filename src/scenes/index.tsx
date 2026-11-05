import type { Box } from "../layout";
import type { TimelineScene, Word } from "../schema";
import { HyperframeScene } from "./Hyperframe";
import type { Style } from "../styles";
import { BarsScene } from "./Bars";
import { BigNumberScene } from "./BigNumber";
import { CompareScene } from "./Compare";
import { IconsScene } from "./Icons";
import { ImageScene } from "./Image";
import { KineticScene } from "./Kinetic";
import { MascotScene } from "./Mascot";
import { StageScene } from "./Stage";
import { StepsScene } from "./Steps";
import { VerdictScene } from "./Verdict";
import { SketchScene } from "./Sketch";
import { Object3dScene } from "./Object3d";
import { ParticlesScene } from "./Particles";
import { PhysicsScene } from "./Physics";

export type SceneProps<V> = {
  v: V;
  scene: TimelineScene;
  style: Style;
  slug: string;
  words: Word[];
  fps: number;
};

export const SceneRenderer: React.FC<{ scene: TimelineScene; style: Style; slug: string; words: Word[]; fps: number; box: Box }> = ({
  box,
  ...p
}) => {
  const v = p.scene.visual;
  switch (v.type) {
    case "hyperframe":
      return <HyperframeScene {...p} v={v} box={box} />;
    case "kinetic":
      return <KineticScene {...p} v={v} />;
    case "bigNumber":
      return <BigNumberScene {...p} v={v} />;
    case "icons":
      return <IconsScene {...p} v={v} />;
    case "mascot":
      return <MascotScene {...p} v={v} />;
    case "image":
      return <ImageScene {...p} v={v} />;
    case "compare":
      return <CompareScene {...p} v={v} />;
    case "steps":
      return <StepsScene {...p} v={v} />;
    case "bars":
      return <BarsScene {...p} v={v} />;
    case "stage":
      return <StageScene {...p} v={v} />;
    case "verdict":
      return <VerdictScene {...p} v={v} />;
    case "sketch":
      return <SketchScene {...p} v={v} />;
    case "object3d":
      return <Object3dScene {...p} v={v} />;
    case "particles":
      return <ParticlesScene {...p} v={v} />;
    case "physics":
      return <PhysicsScene {...p} v={v} />;
  }
};
