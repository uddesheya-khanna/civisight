/**
 * InfrastructureModel — concrete bridge deck / structural slab.
 *
 * Scroll-reactive geometry with three phases:
 *   SOLID   (p 0.03–0.67)  — concrete material, fades in from darkness
 *   SCAN    (p 0.38–0.60)  — crack lines and inspection markers appear
 *   WIRE    (p 0.58–0.82)  — wireframe overlay cross-fades with solid
 *
 * All materials are transparent so opacity can be updated each frame
 * by traversing the group refs, avoiding per-mesh refs.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Helpers ────────────────────────────────────────────────────────
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function fade(p: number, a: number, b: number) {
  return a === b ? 1 : clamp01((p - a) / (b - a));
}
function fadeInOut(p: number, iA: number, iB: number, oA: number, oB: number) {
  if (p < iA) return 0;
  if (p < iB) return fade(p, iA, iB);
  if (p < oA) return 1;
  if (p < oB) return 1 - fade(p, oA, oB);
  return 0;
}

function setGroupOpacity(group: THREE.Group | null, opacity: number) {
  if (!group) return;
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mat = (obj as THREE.Mesh).material as THREE.Material;
      (mat as { opacity: number }).opacity = opacity;
    }
  });
}

// ── Crack line geometry ────────────────────────────────────────────
const CRACK_PATHS: [number, number, number][][] = [
  [[-2.1, 1.515, 0.4], [-1.85, 1.515, 0.12], [-1.68, 1.515, -0.18], [-1.7, 1.515, -0.58]],
  [[-1.85, 1.515, 0.12], [-1.58, 1.515, 0.30], [-1.42, 1.515, 0.18]],
  [[-0.28, 1.515, 0.62], [-0.08, 1.515, 0.25], [0.06, 1.515, -0.15], [0.14, 1.515, -0.52]],
  [[1.42, 1.515, 0.28], [1.57, 1.515, -0.02], [1.62, 1.515, -0.36]],
];

function makeCrackGeo(): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const path of CRACK_PATHS) {
    for (let i = 0; i < path.length - 1; i++) {
      pts.push(...path[i], ...path[i + 1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

// ── Inspection marker boxes ────────────────────────────────────────
const MARKER_DEFS = [
  { pos: [-1.78, 1.68, 0.0], size: [0.88, 0.28, 0.78] },
  { pos: [-0.08, 1.68, 0.06], size: [0.68, 0.28, 0.62] },
  { pos: [1.52, 1.68, -0.02], size: [0.54, 0.28, 0.50] },
];

function makeMarkerEdges(size: [number, number, number]): THREE.BufferGeometry {
  return new THREE.EdgesGeometry(new THREE.BoxGeometry(...size));
}

// ── Accent + wire colors ───────────────────────────────────────────
const CRACK_COLOR  = '#EF4444';
const MARKER_COLOR = '#8FAD5A'; // engineering green accent
const WIRE_COLOR   = '#8FAD5A';

// ── Component ─────────────────────────────────────────────────────
interface InfrastructureModelProps {
  scrollRef: React.MutableRefObject<number>;
}

export function InfrastructureModel({ scrollRef }: InfrastructureModelProps) {
  const solidRef  = useRef<THREE.Group>(null!);
  const wireRef   = useRef<THREE.Group>(null!);
  const crackRef  = useRef<THREE.LineSegments>(null!);
  const crackMat  = useRef<THREE.LineBasicMaterial>(null!);
  const markerMats = useRef<THREE.LineBasicMaterial[]>([]);
  const tRef      = useRef(0);

  // Shared geometries — created once
  const crackGeo   = useMemo(() => makeCrackGeo(), []);
  const markerGeos = useMemo(() =>
    MARKER_DEFS.map(m => makeMarkerEdges(m.size as [number, number, number])), []);

  useFrame((_, delta) => {
    tRef.current += delta;
    const p = scrollRef.current;

    // Solid phase: fade in 0.03→0.14, hold, fade out 0.57→0.68
    const solidOp = fadeInOut(p, 0.03, 0.14, 0.57, 0.68);
    setGroupOpacity(solidRef.current, solidOp);

    // Wireframe phase: fade in 0.58→0.68, hold, fade out 0.74→0.82
    const wireOp = fadeInOut(p, 0.58, 0.68, 0.74, 0.82);
    setGroupOpacity(wireRef.current, wireOp);

    // Crack lines: active during scan 0.38→0.60
    const crackOp = fadeInOut(p, 0.38, 0.44, 0.54, 0.62);
    if (crackMat.current) {
      crackMat.current.opacity = crackOp * (0.7 + Math.sin(tRef.current * 1.4) * 0.2);
    }

    // Inspection markers: active during detection 0.44→0.62
    const markerOp = fadeInOut(p, 0.44, 0.50, 0.56, 0.64);
    markerMats.current.forEach((mat, i) => {
      if (mat) {
        mat.opacity = markerOp * (0.55 + Math.sin(tRef.current * 1.6 + i * 1.3) * 0.25);
      }
    });
  });

  // Concrete-like material factory
  const concreteMat = (color: string, opacity = 1) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04, transparent: true, opacity });
  const wireMat = () =>
    new THREE.MeshBasicMaterial({ color: WIRE_COLOR, wireframe: true, transparent: true, opacity: 0 });

  const SLAB_Y = 1.37;
  const SLAB_D = 3.2;
  const SLAB_W = 2.1;

  const slabPositions: [number, number, number][] = [
    [-2.1, SLAB_Y, 0], [0, SLAB_Y, 0], [2.1, SLAB_Y, 0],
  ];
  const beamPositions: [number, number, number][] = [
    [0, 0.88, -1.2], [0, 0.88, 0.0], [0, 0.88, 1.2],
  ];
  const pillarPositions: [number, number, number][] = [
    [-3.0, 0.45, -1.5], [-3.0, 0.45, 1.5], [3.0, 0.45, -1.5], [3.0, 0.45, 1.5],
  ];

  return (
    <group>
      {/* ── Ground plane ─────────────────────────────────────── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#1A1A18" roughness={0.97} transparent opacity={0.9} />
      </mesh>

      {/* ── SOLID GROUP ──────────────────────────────────────── */}
      <group ref={solidRef}>
        {/* Slab panels */}
        {slabPositions.map((pos, i) => (
          <group key={`slab-${i}`} position={pos}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[SLAB_W - 0.02, 0.28, SLAB_D - 0.02]} />
              <primitive object={concreteMat(i === 1 ? '#B0ACA4' : '#C0BCB4')} />
            </mesh>
            {/* Surface wear layer */}
            <mesh position={[0, 0.142, 0]}>
              <boxGeometry args={[SLAB_W - 0.06, 0.007, SLAB_D - 0.06]} />
              <primitive object={concreteMat('#9A9690', 0.5)} />
            </mesh>
          </group>
        ))}

        {/* Expansion joints */}
        {[-1.05, 1.05].map((x) => (
          <mesh key={`joint-${x}`} position={[x, 1.515, 0]}>
            <boxGeometry args={[0.012, 0.01, SLAB_D]} />
            <primitive object={concreteMat('#545250')} />
          </mesh>
        ))}

        {/* I-beams */}
        {beamPositions.map((pos, i) => (
          <group key={`beam-${i}`} position={pos}>
            {/* Web */}
            <mesh castShadow>
              <boxGeometry args={[6.6, 0.46, 0.11]} />
              <primitive object={concreteMat('#A0A09A')} />
            </mesh>
            {/* Bottom flange */}
            <mesh position={[0, -0.26, 0]}>
              <boxGeometry args={[6.6, 0.08, 0.32]} />
              <primitive object={concreteMat('#888882')} />
            </mesh>
          </group>
        ))}

        {/* Abutment pillars */}
        {pillarPositions.map((pos, i) => (
          <mesh key={`pillar-${i}`} position={pos} castShadow>
            <boxGeometry args={[0.30, 1.8, 0.30]} />
            <primitive object={concreteMat('#888882')} />
          </mesh>
        ))}
      </group>

      {/* ── WIREFRAME GROUP (cross-fades over solid) ──────────── */}
      <group ref={wireRef}>
        {slabPositions.map((pos, i) => (
          <mesh key={`wslab-${i}`} position={pos}>
            <boxGeometry args={[SLAB_W - 0.02, 0.28, SLAB_D - 0.02]} />
            <primitive object={wireMat()} />
          </mesh>
        ))}
        {beamPositions.map((pos, i) => (
          <group key={`wbeam-${i}`} position={pos}>
            <mesh>
              <boxGeometry args={[6.6, 0.46, 0.11]} />
              <primitive object={wireMat()} />
            </mesh>
            <mesh position={[0, -0.26, 0]}>
              <boxGeometry args={[6.6, 0.08, 0.32]} />
              <primitive object={wireMat()} />
            </mesh>
          </group>
        ))}
        {pillarPositions.map((pos, i) => (
          <mesh key={`wpillar-${i}`} position={pos}>
            <boxGeometry args={[0.30, 1.8, 0.30]} />
            <primitive object={wireMat()} />
          </mesh>
        ))}
      </group>

      {/* ── CRACK VISUALISATION (scan phase) ─────────────────── */}
      <lineSegments ref={crackRef} geometry={crackGeo}>
        <lineBasicMaterial
          ref={crackMat}
          color={CRACK_COLOR}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── INSPECTION MARKERS (detection phase) ─────────────── */}
      {MARKER_DEFS.map((m, i) => (
        <lineSegments
          key={`mk-${i}`}
          geometry={markerGeos[i]}
          position={m.pos as [number, number, number]}
        >
          <lineBasicMaterial
            ref={(el) => { if (el) markerMats.current[i] = el; }}
            color={MARKER_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineSegments>
      ))}
    </group>
  );
}
