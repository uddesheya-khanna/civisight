/**
 * ScanBeam — translucent vertical plane that sweeps across the structure.
 *
 * Scroll-activated: only visible in the scan phase (p ~0.37–0.60).
 * Sweeps left-to-right continuously while visible.
 * Color matches the engineering-green accent.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function fadeInOut(p: number, iA: number, iB: number, oA: number, oB: number) {
  if (p < iA) return 0;
  if (p < iB) return clamp01((p - iA) / (iB - iA));
  if (p < oA) return 1;
  if (p < oB) return 1 - clamp01((p - oA) / (oB - oA));
  return 0;
}

interface ScanBeamProps {
  scrollRef: React.MutableRefObject<number>;
  xMin?: number;
  xMax?: number;
  speed?: number;
  color?: string;
}

export function ScanBeam({
  scrollRef,
  xMin = -3.2,
  xMax = 3.2,
  speed = 0.52,
  color = '#8FAD5A',
}: ScanBeamProps) {
  const meshRef  = useRef<THREE.Mesh>(null!);
  const matRef   = useRef<THREE.MeshStandardMaterial>(null!);
  const posRef   = useRef(xMin);
  const dirRef   = useRef(1);

  useFrame((_, delta) => {
    const p = scrollRef.current;
    const opacity = fadeInOut(p, 0.37, 0.43, 0.54, 0.60) * 0.22;

    if (matRef.current) matRef.current.opacity = opacity;

    if (opacity > 0.002) {
      posRef.current += dirRef.current * speed * delta;
      if (posRef.current >= xMax) dirRef.current = -1;
      if (posRef.current <= xMin) dirRef.current = 1;
      if (meshRef.current) meshRef.current.position.x = posRef.current;
    }
  });

  return (
    <mesh ref={meshRef} position={[xMin, 1.1, 0]}>
      <boxGeometry args={[0.055, 3.2, 4.0]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.9}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
