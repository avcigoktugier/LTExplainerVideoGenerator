// Custom artwork: public/art/<name>.svg, inlined so it can use the palette through CSS variables
// (var(--ink), var(--accent), var(--main) …). See public/art/README.md for how to draw one.
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { resolveColor, type Style } from "../styles";

type Loaded = { html: string; w: number; h: number } | "missing";
const cache = new Map<string, Promise<Loaded>>();

const load = (name: string): Promise<Loaded> => {
  let p = cache.get(name);
  if (!p) {
    p = fetch(staticFile(`art/${name}.svg`))
      .then(async (r) => {
        if (!r.ok) return "missing" as const;
        const text = await r.text();
        const vb = text.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
        if (!vb) return "missing" as const;
        // drop XML prolog/comments; size the root to its box
        const html = text
          .replace(/<\?xml[^>]*\?>/g, "")
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<svg\b/, '<svg width="100%" height="100%" style="overflow:visible;display:block"');
        return { html, w: Number(vb[1]), h: Number(vb[2]) };
      })
      .catch(() => "missing" as const);
    cache.set(name, p);
  }
  return p;
};

// Loads every artwork a scene uses before its first frame renders
export const useArts = (names: string[]) => {
  const key = [...new Set(names)].sort().join(",");
  const [arts, setArts] = useState<Record<string, Loaded> | null>(null);
  const [handle] = useState(() => (key ? delayRender(`art: ${key}`) : null));
  useEffect(() => {
    if (!key || handle === null) return;
    const list = key.split(",");
    Promise.all(list.map(load))
      .then((loaded) => {
        setArts(Object.fromEntries(list.map((n, i) => [n, loaded[i]])));
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [key, handle]);
  return arts ?? {};
};

export type { Loaded as ArtData };

export const paletteVars = (style: Style, main?: string): React.CSSProperties =>
  ({
    "--ink": style.ink,
    "--paper": style.bg2,
    "--bg": style.bg,
    "--muted": style.muted,
    "--accent": style.accent,
    "--accent2": style.accent2,
    "--danger": style.danger,
    "--cast1": style.cast[0],
    "--cast2": style.cast[1],
    "--cast3": style.cast[2],
    "--main": resolveColor(style, main, style.accent),
  }) as React.CSSProperties;

export const Art: React.FC<{ name: string; art: Loaded; w: number; h: number; style: Style; color?: string }> = ({ name, art, w, h, style, color }) => {
  if (art === "missing")
    return (
      <div
        style={{
          width: w,
          height: h,
          border: `4px dashed ${style.danger}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: style.fontMono,
          fontSize: 22,
          color: style.danger,
          textAlign: "center",
        }}
      >
        art yok:
        <br />
        {name}
      </div>
    );
  return <div style={{ width: w, height: h, ...paletteVars(style, color) }} dangerouslySetInnerHTML={{ __html: art.html }} />;
};
