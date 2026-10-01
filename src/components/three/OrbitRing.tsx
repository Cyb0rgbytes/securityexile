"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface OrbitSpec {
  radius: number;
  /** Euler tilt of the orbit plane, radians. */
  tilt: [number, number, number];
  /** rad/s around the orbit's own axis; sign sets direction. */
  speed: number;
  color: string;
  /** Node angles on the ring, radians. */
  nodes: number[];
  /** Index into `nodes` rendered as the magenta accent, if any. */
  accent?: number;
}

const SEGMENTS = 128;
const ACCENT = new THREE.Color("#ff2bd6").multiplyScalar(2.4);

/**
 * One tilted orbit: a thin glowing ring, its data nodes, and dashed
 * filaments linking each node back to the core. Everything lives in the
 * ring's local space, so rotating the group moves nodes and links together
 * with no per-frame geometry updates.
 */
export function OrbitRing({ radius, tilt, speed, color, nodes, accent }: OrbitSpec) {
  const spin = useRef<THREE.Group>(null);

  const { ringLine, links, nodePositions, nodeColor } = useMemo(() => {
    const base = new THREE.Color(color);

    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = (i / SEGMENTS) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    // Built as an object: <line> in JSX collides with the SVG element type.
    const ringLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({
        color: base.clone().multiplyScalar(1.4),
        transparent: true,
        opacity: 0.7,
        toneMapped: false,
      }),
    );

    const nodePositions = nodes.map(
      (a) => new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0),
    );
    const linkPts: THREE.Vector3[] = [];
    // Start each link just outside the core shell, not at the origin.
    for (const p of nodePositions) linkPts.push(p.clone().multiplyScalar(1.3 / radius), p);
    const links = new THREE.BufferGeometry().setFromPoints(linkPts);
    // LineDashedMaterial needs per-vertex distances on LineSegments.
    new THREE.LineSegments(links).computeLineDistances();

    return { ringLine, links, nodePositions, nodeColor: base.clone().multiplyScalar(2.4) };
  }, [radius, nodes, color]);

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += dt * speed;
  });

  return (
    <group rotation={tilt}>
      <group ref={spin}>
        <primitive object={ringLine} />

        <lineSegments geometry={links}>
          <lineDashedMaterial
            color={color}
            dashSize={0.06}
            gapSize={0.08}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </lineSegments>

        {nodePositions.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[i === accent ? 0.06 : 0.075, 16, 16]} />
            <meshBasicMaterial color={i === accent ? ACCENT : nodeColor} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
