/**
 * CrackVisualization — renders stylized crack-like line segments
 * on the surface of the concrete slab geometry.
 * Lines are drawn using THREE.LineSegments with a custom geometry.
 * They pulse in opacity to draw the eye without being distracting.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Each crack is a polyline defined as a sequence of [x, y, z] points.
// These are placed on or just above the slab surface (y ≈ 1.51).
const CRACK_PATHS: [number, number, number][][] = [
  // Crack 1 — long diagonal fracture on left slab section
  [
    [-2.1, 1.515, 0.4],
    [-1.85, 1.515, 0.15],
    [-1.7, 1.515, -0.1],
    [-1.65, 1.515, -0.45],
    [-1.72, 1.515, -0.75],
  ],
  // Crack 2 — short hairline branching from crack 1
  [
    [-1.85, 1.515, 0.15],
    [-1.6, 1.515, 0.28],
    [-1.45, 1.515, 0.18],
  ],
  // Crack 3 — isolated crack on centre slab
  [
    [-0.3, 1.515, 0.6],
    [-0.1, 1.515, 0.28],
    [0.05, 1.515, -0.1],
    [0.12, 1.515, -0.5],
  ],
  // Crack 4 — small hairline on right section
  [
    [1.4, 1.515, 0.3],
    [1.55, 1.515, 0.0],
    [1.6, 1.515, -0.32],
  ],
];

function buildCrackGeometry(paths: [number, number, number][][]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      positions.push(...path[i], ...path[i + 1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

interface CrackVisualizationProps {
  visible?: boolean;
  color?: string;
}

export function CrackVisualization({ visible = true, color = '#EF4444' }: CrackVisualizationProps) {
  const lineRef = useRef<THREE.LineSegments>(null!);
  const matRef = useRef<THREE.LineBasicMaterial>(null!);
  const tRef = useRef(0);

  const geometry = useMemo(() => buildCrackGeometry(CRACK_PATHS), []);

  useFrame((_, delta) => {
    tRef.current += delta;
    if (matRef.current) {
      // Gentle pulse between 0.55 and 0.95 opacity
      matRef.current.opacity = visible
        ? 0.75 + Math.sin(tRef.current * 1.2) * 0.2
        : 0;
    }
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        color={color}
        linewidth={1}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </lineSegments>
  );
}
