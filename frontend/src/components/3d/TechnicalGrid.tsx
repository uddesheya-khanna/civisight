/**
 * TechnicalGrid — engineering measurement grid overlay.
 *
 * Visible during the "technical transformation" phase (p ~0.58–0.80).
 * Rendered imperatively via GridHelper so it survives re-renders without
 * recreating the geometry each frame.
 *
 * A second finer grid adds an orthographic-blueprint feel.
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

interface TechnicalGridProps {
  scrollRef: React.MutableRefObject<number>;
}

export function TechnicalGrid({ scrollRef }: TechnicalGridProps) {
  const coarseRef = useRef<THREE.GridHelper | null>(null);
  const fineRef   = useRef<THREE.GridHelper | null>(null);
  const axesRef   = useRef<THREE.AxesHelper | null>(null);
  const added     = useRef(false);

  useFrame(({ scene }) => {
    // Lazily add helpers to scene once
    if (!added.current) {
      const coarseGrid = new THREE.GridHelper(14, 14, '#4A6B35', '#4A6B35');
      coarseGrid.position.set(0, 0.01, 0);
      (coarseGrid.material as THREE.Material).transparent = true;
      (coarseGrid.material as THREE.Material).opacity = 0;
      (coarseGrid.material as THREE.Material).depthWrite = false;
      coarseRef.current = coarseGrid;
      scene.add(coarseGrid);

      const fineGrid = new THREE.GridHelper(14, 56, '#2E4422', '#2E4422');
      fineGrid.position.set(0, 0.02, 0);
      (fineGrid.material as THREE.Material).transparent = true;
      (fineGrid.material as THREE.Material).opacity = 0;
      (fineGrid.material as THREE.Material).depthWrite = false;
      fineRef.current = fineGrid;
      scene.add(fineGrid);

      // Subtle axes indicator at origin
      const axes = new THREE.AxesHelper(1.2);
      axes.position.set(-3.5, 0.05, -1.8);
      (axes.material as THREE.Material).transparent = true;
      (axes.material as THREE.Material).opacity = 0;
      axesRef.current = axes;
      scene.add(axes);

      added.current = true;
    }

    const p = scrollRef.current;
    const op = fadeInOut(p, 0.58, 0.66, 0.74, 0.82);

    if (coarseRef.current) {
      (coarseRef.current.material as THREE.Material).opacity = op * 0.50;
    }
    if (fineRef.current) {
      (fineRef.current.material as THREE.Material).opacity = op * 0.22;
    }
    if (axesRef.current) {
      (axesRef.current.material as THREE.Material).opacity = op * 0.65;
    }
  });

  return null;
}
