/**
 * SceneLighting — dynamic lighting that evolves with scroll.
 *
 * Phases:
 *   0.00–0.08  intro dark  — structure emerges from near-blackness
 *   0.08–0.30  reveal      — light builds to full daylight quality
 *   0.30–0.62  inspection  — cool, analytical working light
 *   0.62–0.72  technical   — slightly cooler, blueprint atmosphere
 *   0.72–0.84  modules     — subtle warm shift on module 03 (safety)
 *   0.84–1.00  CTA         — clean, neutral architectural light
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function fade(p: number, a: number, b: number) {
  return clamp((p - a) / (b - a), 0, 1);
}

interface SceneLightingProps {
  scrollRef: React.MutableRefObject<number>;
}

export function SceneLighting({ scrollRef }: SceneLightingProps) {
  const ambRef  = useRef<THREE.AmbientLight>(null!);
  const dir1Ref = useRef<THREE.DirectionalLight>(null!);
  const dir2Ref = useRef<THREE.DirectionalLight>(null!);
  const ptRef   = useRef<THREE.PointLight>(null!);

  useFrame(() => {
    const p = scrollRef.current;

    // ── Ambient: starts at 0.04 → builds to 0.42 by p=0.20 ──────────
    const ambIntensity = p < 0.08
      ? 0.04 + fade(p, 0, 0.08) * 0.18
      : 0.22 + fade(p, 0.08, 0.22) * 0.20;

    // ── Main directional: colour shifts from warm white to cool analytical
    // Module 03 (safety ~0.79-0.85): slight warmth
    const warmth = p > 0.79 && p < 0.87
      ? Math.sin(fade(p, 0.79, 0.87) * Math.PI) * 0.15
      : 0;

    const dir1Intensity = clamp(0.5 + fade(p, 0.06, 0.22) * 0.65 + warmth, 0.05, 1.25);

    // Blueprint phase (0.62-0.72): shift to cooler fill
    const blueprintT = p > 0.62 && p < 0.72
      ? Math.sin(fade(p, 0.62, 0.72) * Math.PI)
      : 0;
    const dir2Intensity = clamp(0.15 + blueprintT * 0.35, 0.05, 0.55);

    if (ambRef.current)  ambRef.current.intensity  = ambIntensity;
    if (dir1Ref.current) dir1Ref.current.intensity = dir1Intensity;
    if (dir2Ref.current) dir2Ref.current.intensity = dir2Intensity;
    if (ptRef.current)   ptRef.current.intensity   = clamp(warmth * 1.2, 0, 0.5);
  });

  return (
    <>
      {/* Ambient — very low to start, builds through reveal */}
      <ambientLight ref={ambRef} intensity={0.04} color="#E8EDF5" />

      {/* Primary sun — slightly off-centre, casts shadows */}
      <directionalLight
        ref={dir1Ref}
        position={[5, 9, 4]}
        intensity={0.5}
        color="#F4F0E8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-4}
      />

      {/* Cool fill — analytical / blueprint atmosphere */}
      <directionalLight
        ref={dir2Ref}
        position={[-4, 3, -4]}
        intensity={0.15}
        color="#A8C4E0"
      />

      {/* Warm point — activated briefly in safety module */}
      <pointLight
        ref={ptRef}
        position={[1, 5, 3]}
        intensity={0}
        color="#F4A460"
      />
    </>
  );
}
