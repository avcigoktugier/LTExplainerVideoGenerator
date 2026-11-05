// "object3d": a real 3D object (kalem's Three.js scenes) built from primitives — no model files, no downloads.
// Lit with a procedural studio environment so gold reads as metal. Everything is driven by useCurrentFrame().
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { actionFrame } from "../timing";
import type { Visual } from "../schema";
import type { Style } from "../styles";
import { CANVAS } from "./Stage";
import type { SceneProps } from ".";

type V = Extract<Visual, { type: "object3d" }>;

// Procedural reflections (three's RoomEnvironment): metal needs something to reflect
const Studio: React.FC = () => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pm = new PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
};

type M = { gold: React.ReactNode; dark: React.ReactNode; ivory: React.ReactNode; glow: (k: number) => React.ReactNode };
const mats = (style: Style): M => ({
  gold: <meshStandardMaterial color={style.accent} metalness={0.9} roughness={0.25} />,
  dark: <meshStandardMaterial color="#1A2230" metalness={0.35} roughness={0.55} />,
  ivory: <meshStandardMaterial color="#ECE7DC" metalness={0.05} roughness={0.6} />,
  glow: (k) => <meshStandardMaterial color="#2A2418" emissive={style.accent} emissiveIntensity={0.15 + k * 1.6} roughness={0.5} />,
});

// a: action progress 0→1 (springy), t: frames since the object appeared
const Scales: React.FC<{ m: M; a: number; t: number; tilt: number }> = ({ m, a, t, tilt }) => {
  const ang = -tilt * 0.3 * a + Math.sin(t / 14) * 0.03 * (1 - a * 0.7);
  const arm = 1.3;
  const pan = (side: -1 | 1) => {
    const x = Math.cos(ang) * arm * side;
    const y = 0.9 + Math.sin(ang) * arm * side;
    return (
      <group position={[x, y, 0]} key={side}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, -0.45, 0]} rotation={[0, 0, s * 0.42]}>
            <cylinderGeometry args={[0.012, 0.012, 0.98, 6]} />
            {m.gold}
          </mesh>
        ))}
        <mesh position={[0, -0.92, 0]}>
          <cylinderGeometry args={[0.5, 0.36, 0.1, 40]} />
          {m.gold}
        </mesh>
      </group>
    );
  };
  return (
    <group position={[0, -0.25, 0]}>
      <mesh position={[0, -1.45, 0]}>
        <cylinderGeometry args={[0.75, 0.9, 0.16, 48]} />
        {m.dark}
      </mesh>
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.32, 0.6, 0.18, 48]} />
        {m.gold}
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 2.3, 20]} />
        {m.gold}
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        {m.gold}
      </mesh>
      <mesh position={[0, 0.9, 0]} rotation={[0, 0, ang]}>
        <boxGeometry args={[2.75, 0.07, 0.07]} />
        {m.gold}
      </mesh>
      {pan(-1)}
      {pan(1)}
    </group>
  );
};

const Gavel: React.FC<{ m: M; a: number; t: number; hit: number }> = ({ m, a, t, hit }) => {
  // raised and hovering until the cue, slams down, small rebound
  // (negative z rotation lifts the head; 0 = head resting on the block)
  const raised = -0.75 - Math.sin(t / 12) * 0.05;
  const down =
    hit < 0
      ? raised
      : hit < 5
        ? interpolate(hit, [0, 5], [raised, 0], { easing: Easing.in(Easing.quad) })
        : -Math.sin(Math.min(1, (hit - 5) / 10) * Math.PI) * 0.12 * (1.2 - a * 0.3);
  return (
    <group position={[0, -0.1, 0]} rotation={[0.3, -0.5, 0]} scale={1.25}>
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.95, 1.0, 0.28, 48]} />
        {m.dark}
      </mesh>
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.92, 0.025, 12, 64]} />
        {m.gold}
      </mesh>
      {/* pivot at the handle end, so the head swings in an arc */}
      <group position={[1.9, -0.2, 0]} rotation={[0, 0, down]}>
        <mesh position={[-1.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.1, 1.9, 20]} />
          {m.dark}
        </mesh>
        <group position={[-2.0, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.36, 0.36, 1.25, 40]} />
            {m.dark}
          </mesh>
          {[-0.45, 0.45].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.385, 0.385, 0.09, 40]} />
              {m.gold}
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};

const House: React.FC<{ m: M; a: number }> = ({ m, a }) => (
  <group position={[0, -0.55, 0]} rotation={[0.12, 0, 0]}>
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2, 1.35, 1.5]} />
      {m.dark}
    </mesh>
    <mesh position={[0, 1.12, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[1.62, 0.95, 4]} />
      {m.gold}
    </mesh>
    <mesh position={[0, -0.28, 0.76]}>
      <boxGeometry args={[0.4, 0.78, 0.04]} />
      {m.gold}
    </mesh>
    {[-0.62, 0.62].map((x) => (
      <mesh key={x} position={[x, 0.18, 0.76]}>
        <boxGeometry args={[0.38, 0.36, 0.03]} />
        {m.glow(a)}
      </mesh>
    ))}
    <mesh position={[0, -0.72, 0]}>
      <boxGeometry args={[2.5, 0.08, 2]} />
      {m.gold}
    </mesh>
  </group>
);

const Document: React.FC<{ m: M; a: number }> = ({ m, a }) => (
  <group position={[0, -0.2, 0]} rotation={[-1.05, 0, 0.12]}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[i * 0.05 - 0.05, i * 0.03, -i * 0.04]} rotation={[0, (i - 1) * 0.05, 0]}>
        <boxGeometry args={[1.7, 0.02, 2.2]} />
        {m.ivory}
      </mesh>
    ))}
    {/* top page lifts and turns on the cue */}
    <group position={[-0.85, 0.1, 0]} rotation={[0, 0, a * 0.55]}>
      <mesh position={[0.85, 0, 0]}>
        <boxGeometry args={[1.7, 0.02, 2.2]} />
        {m.ivory}
      </mesh>
      {[-0.7, -0.45, -0.2, 0.05, 0.3].map((z, i) => (
        <mesh key={z} position={[0.8 - (i % 2) * 0.1, 0.015, z]}>
          <boxGeometry args={[1.2 - (i % 2) * 0.2, 0.004, 0.06]} />
          {m.dark}
        </mesh>
      ))}
      <mesh position={[1.25, 0.03, 0.72]}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 40]} />
        {m.gold}
      </mesh>
    </group>
  </group>
);

const Courthouse: React.FC<{ m: M; a: number }> = ({ m, a }) => (
  <group position={[0, -0.5, 0]} rotation={[0.1, 0, 0]}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, -0.95 + i * 0.12, 0.1 - i * 0.08]}>
        <boxGeometry args={[3.1 - i * 0.25, 0.12, 1.6 - i * 0.16]} />
        {m.ivory}
      </mesh>
    ))}
    {[-1.05, -0.35, 0.35, 1.05].map((x) => (
      <mesh key={x} position={[x, -0.05, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 1.45, 24]} />
        {m.ivory}
      </mesh>
    ))}
    <mesh position={[0, 0.76, 0]}>
      <boxGeometry args={[2.75, 0.18, 1.1]} />
      {m.gold}
    </mesh>
    <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.32, 1]}>
      <cylinderGeometry args={[1.55, 1.55, 1.0, 3, 1, false, Math.PI / 2]} />
      {m.glow(a)}
    </mesh>
  </group>
);

const Key: React.FC<{ m: M; a: number }> = ({ m, a }) => (
  <group rotation={[a * (Math.PI / 2), 0, -0.5]}>
    <mesh position={[-1.1, 0, 0]}>
      <torusGeometry args={[0.45, 0.13, 20, 48]} />
      {m.gold}
    </mesh>
    <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.09, 0.09, 2.1, 20]} />
      {m.gold}
    </mesh>
    {[0.95, 1.2].map((x, i) => (
      <mesh key={x} position={[x, -0.2 - i * 0.05, 0]}>
        <boxGeometry args={[0.14, 0.32 + i * 0.1, 0.1]} />
        {m.gold}
      </mesh>
    ))}
  </group>
);

const Model: React.FC<{ v: V; style: Style; a: number; t: number; hit: number }> = ({ v, style, a, t, hit }) => {
  const m = mats(style);
  switch (v.model) {
    case "scales":
      return <Scales m={m} a={a} t={t} tilt={v.tilt ?? 0.8} />;
    case "gavel":
      return <Gavel m={m} a={a} t={t} hit={hit} />;
    case "house":
      return <House m={m} a={a} />;
    case "document":
      return <Document m={m} a={a} />;
    case "courthouse":
      return <Courthouse m={m} a={a} />;
    case "key":
      return <Key m={m} a={a} />;
  }
};

export const Object3dScene: React.FC<SceneProps<V>> = ({ v, style, scene, words, fps }) => {
  const frame = useCurrentFrame();
  const { fps: vfps } = useVideoConfig();
  const ctx = { words, from: scene.from, durationInFrames: scene.durationInFrames, fps };
  const act = actionFrame(v, ctx, scene.durationInFrames); // shared with the sound placer
  const enter = spring({ frame, fps: vfps, config: { damping: 16, stiffness: 90 } });
  const a = spring({ frame: frame - act, fps: vfps, config: { damping: 12, stiffness: 120 } });
  const orbit = ((v.orbit ?? 50) * Math.PI) / 180;
  const spin = interpolate(frame, [0, scene.durationInFrames], [-orbit / 2, orbit / 2], { easing: Easing.inOut(Easing.sin) });
  return (
    <div style={{ position: "relative", width: CANVAS.w, height: CANVAS.h }}>
      <ThreeCanvas width={CANVAS.w} height={CANVAS.h} camera={{ position: [0, 0.6, 6.2], fov: 38 }} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
        <Studio />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} color="#FFF3DD" />
        <directionalLight position={[-5, 2, -4]} intensity={1.4} color="#9DB4D6" />
        <group rotation={[0, spin, 0]} scale={0.6 + enter * 0.4} position={[0, 0.25 + (1 - enter) * -0.4, 0]}>
          <Model v={v} style={style} a={a} t={frame} hit={frame - act} />
        </group>
      </ThreeCanvas>
      {v.label && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 26,
            textAlign: "center",
            fontFamily: style.fontMono,
            fontSize: 26,
            letterSpacing: 5,
            color: style.ink,
            opacity: interpolate(frame, [10, 22], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {v.label.toLocaleUpperCase("tr-TR")}
        </div>
      )}
    </div>
  );
};
