import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* Brand spectrum sampled for particle colours */
const PALETTE = [
  new THREE.Color("#7c6cff"),
  new THREE.Color("#38d6ff"),
  new THREE.Color("#2fe0c0"),
  new THREE.Color("#a99bff"),
];

/* Deterministic PRNG (mulberry32) — pure, so the particle field is stable
   across renders and the cloud generation stays free of impure globals. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Synapses({ count = 1400 }) {
  const points = useRef();
  const lines = useRef();
  const group = useRef();

  // Particle cloud in a soft sphere
  const { positions, colors, linePositions } = useMemo(() => {
    const rand = makeRng(0x9e3779b9 ^ count);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const raw = [];
    for (let i = 0; i < count; i++) {
      const r = 2.6 * Math.cbrt(rand());
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.78;
      const z = r * Math.cos(phi);
      pos.set([x, y, z], i * 3);
      raw.push([x, y, z]);
      const c = PALETTE[(rand() * PALETTE.length) | 0];
      col.set([c.r, c.g, c.b], i * 3);
    }
    // Precompute a sparse set of "synapse" links between near neighbours
    const lp = [];
    for (let i = 0; i < count; i += 7) {
      const a = raw[i];
      let best = -1;
      let bestD = 0.42;
      for (let j = i + 1; j < Math.min(i + 40, count); j++) {
        const b = raw[j];
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        const dsq = dx * dx + dy * dy + dz * dz;
        if (dsq < bestD) { bestD = dsq; best = j; }
      }
      if (best > -1) lp.push(...a, ...raw[best]);
    }
    return { positions: pos, colors: col, linePositions: new Float32Array(lp) };
  }, [count]);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.06;
      const { x, y } = state.pointer;
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, y * 0.25, 0.05);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, -x * 0.12, 0.05);
    }
    if (points.current) {
      const m = points.current.material;
      m.opacity = 0.62 + Math.sin(state.clock.elapsedTime * 1.4) * 0.12; // gentle decay flicker
    }
  });

  return (
    <group ref={group}>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#5a6dff"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

/** Lazy-loaded; renders nothing heavy until mounted. */
export default function NeuralField() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.4], fov: 52 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.8]}
      style={{ background: "transparent" }}
    >
      <Synapses />
    </Canvas>
  );
}
