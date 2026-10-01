"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Colors above 1.0 push past the bloom threshold, so only these parts glow.
const CYAN = new THREE.Color("#00e5ff").multiplyScalar(1.6);
const NEON = new THREE.Color("#00ff9c").multiplyScalar(1.3);
const WHITE = new THREE.Color("#e6fffb").multiplyScalar(2.2);

/** Geodesic wireframe sphere with glowing vertices and an inner energy core. */
export function NetworkCore({ radius = 1.25 }: { radius?: number }) {
  const shell = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Mesh>(null);

  const { edges, vertices } = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(radius, 1);
    const edges = new THREE.EdgesGeometry(ico, 1);
    // De-duplicate vertices so each lattice node is drawn once.
    const pos = ico.getAttribute("position");
    const seen = new Set<string>();
    const pts: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const vertices = new THREE.BufferGeometry();
    vertices.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    ico.dispose();
    return { edges, vertices };
  }, [radius]);

  useFrame((state, dt) => {
    if (shell.current) shell.current.rotation.y += dt * 0.12;
    if (heart.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.08;
      heart.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <group ref={shell}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={CYAN} transparent opacity={0.85} toneMapped={false} />
        </lineSegments>
        <points geometry={vertices}>
          <pointsMaterial color={WHITE} size={0.07} sizeAttenuation toneMapped={false} />
        </points>
      </group>

      {/* faint green volume inside the shell */}
      <mesh>
        <sphereGeometry args={[radius * 0.92, 32, 32]} />
        <meshBasicMaterial
          color="#00ff9c"
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* pulsing heart */}
      <mesh ref={heart}>
        <icosahedronGeometry args={[radius * 0.16, 2]} />
        <meshBasicMaterial color={NEON} toneMapped={false} />
      </mesh>
    </group>
  );
}
