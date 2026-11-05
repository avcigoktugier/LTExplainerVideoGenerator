import { Composition, staticFile } from "remotion";
import { Explainer, type ExplainerProps } from "./Explainer";
import { FPS, HEIGHT, WIDTH, type Timeline } from "./schema";

// slug "" = the project you last built (npm run make / timeline writes projects/_current.json)
const resolveSlug = async (slug: string) => {
  if (slug) return slug;
  const res = await fetch(staticFile("projects/_current.json"));
  if (!res.ok) throw new Error("No project built yet. Run: npm run make -- <slug> --mock");
  return ((await res.json()) as { slug: string }).slug;
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={{ slug: "" } as ExplainerProps}
    calculateMetadata={async ({ props }) => {
      const slug = await resolveSlug(props.slug);
      const res = await fetch(staticFile(`projects/${slug}/timeline.json`));
      if (!res.ok) throw new Error(`No timeline for "${slug}". Run: npm run make -- ${slug}`);
      const timeline = (await res.json()) as Timeline;
      return {
        durationInFrames: timeline.durationInFrames,
        fps: timeline.fps,
        width: timeline.width,
        height: timeline.height,
        props: { ...props, slug, timeline },
      };
    }}
  />
);
