"use client";

import { useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { NetworkCore } from "./NetworkCore";
import { OrbitRing, type OrbitSpec } from "./OrbitRing";

// Mirrors the poster art (assets.json → hero-core-poster) so the swap is seamless.
const ORBITS: OrbitSpec[] = [
  {
    radius: 2.15,
    tilt: [1.2, 0.35, 0.1],
    speed: 0.22,
    color: "#00e5ff",
    nodes: [0.3, 1.9, 2.8, 4.1, 5.4],
    accent: 2,
  },
  {
    radius: 2.0,
    tilt: [1.05, -0.55, 0.9],
    speed: -0.17,
    color: "#00ff9c",
    nodes: [0.8, 2.3, 3.6, 5.0],
  },
  {
    radius: 2.45,
    tilt: [1.45, 0.1, -0.4],
    speed: 0.12,
    color: "#00e5ff",
    nodes: [1.2, 3.9],
  },
];

/** Eases the whole rig toward the pointer for a subtle parallax. */
function Parallax({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 3);
    g.rotation.y += (state.pointer.x * 0.35 - g.rotation.y) * k;
    g.rotation.x += (-state.pointer.y * 0.25 - g.rotation.x) * k;
  });
  return <group ref={ref}>{children}</group>;
}

interface Props {
  /** false pauses rendering (offscreen / tab hidden) without unmounting. */
  active: boolean;
  onReady?: () => void;
  fallback: ReactNode;
}

export default function HeroScene({ active, onReady, fallback }: Props) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      fallback={fallback}
      onCreated={() => onReady?.()}
      aria-hidden="true"
    >
      <Parallax>
        <NetworkCore />
        {ORBITS.map((o, i) => (
          <OrbitRing key={i} {...o} />
        ))}
      </Parallax>
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.9} intensity={1.1} radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
