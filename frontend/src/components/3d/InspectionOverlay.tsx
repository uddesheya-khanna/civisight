/**
 * InspectionOverlay — minimal R3F scene rendered on a transparent canvas.
 *
 * Role: a single horizontal scan line that sweeps across the infrastructure
 * photo during the scan phase.  The canvas sits over the photography with
 * gl.alpha=true so only the WebGL elements are visible — the photo shows
 * through everywhere else.
 *
 * Kept intentionally minimal: R3F enhances the photo, not competes with it.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ACCENT = '#8FAD5A'; // engineering green

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function fadeInOut(p: number, iA: number, iB: number, oA: number, oB: number) {
  if (p < iA) return 0;
  if (p < iB) return clamp01((p - iA) / (iB - iA));
  if (p < oA) return 1;
  if (p < oB) return 1 - clamp01((p - oA) / (oB - oA));
  return 0;
}

/** A horizontal glowing plane that sweeps top→bottom during the scan phase */
function ScanLine({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef  = useRef<THREE.MeshBasicMaterial>(null!);
  const { viewport } = useThree();

  useFrame(() => {
    const p = scrollRef.current;
    const op = fadeInOut(p, 0.37, 0.43, 0.55, 0.61) * 0.95;

    // Sweep from 35% to 70% of the viewport height during the scan phase
    const scanFrac = p < 0.37 ? 0.35 : Math.min(0.70, 0.35 + (p - 0.37) / 0.24 * 0.35);
    const yWorld   = (0.5 - scanFrac) * viewport.height; // convert fraction → world Y

    if (matRef.current) matRef.current.opacity = op;
    if (meshRef.current) meshRef.current.position.set(0, yWorld, 0);
  });

  return (
    <mesh ref={meshRef}>
      {/* Width slightly wider than viewport so no edge gap */}
      <planeGeometry args={[50, 0.008]} />
      <meshBasicMaterial
        ref={matRef}
        color={ACCENT}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

/** The public-facing scene — orthographic so Y maps to screen fraction */
interface InspectionOverlayProps {
  scrollRef: React.MutableRefObject<number>;
}

export function InspectionOverlay({ scrollRef }: InspectionOverlayProps) {
  return (
    <ScanLine scrollRef={scrollRef} />
  );
}
