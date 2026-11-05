// Scene box sizes, shared by the video (where scenes are drawn) and the pipeline
// (HyperFrames compositions are rendered at exactly these sizes).
import { HEIGHT, WIDTH } from "./schema";
import { SAFE } from "./styles";

export const DOSSIER_SIDE = 70;
export const DOSSIER_STAGE = { top: 640, height: 720 };

export type Box = { w: number; h: number };

export const sceneBox = (format: "explainer" | "dossier"): Box =>
  format === "dossier"
    ? { w: WIDTH - DOSSIER_SIDE * 2, h: DOSSIER_STAGE.height }
    : { w: WIDTH - SAFE.side * 2, h: HEIGHT - SAFE.top - SAFE.bottom };

export const FULL_BOX: Box = { w: WIDTH, h: HEIGHT };
