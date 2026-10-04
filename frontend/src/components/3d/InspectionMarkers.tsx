/**
 * InspectionMarkers — floating bounding-box-like wireframe annotations
 * that appear over defect areas, paired with animated label tags.
 * Labels are rendered as HTML overlays via R3F's built-in raycasting
 * support (we use group positions and a parent HTML layer instead of
 * Html from drei, which isn't installed).
 * The wireframe boxes are pure Three.js geometry.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MarkerDef {
  position: [number, number, number];
  size: [number, number, number];
  label: string;
  confidence: string;
  color: string;
}

// Positioned over the crack locations on the slab surface
const MARKERS: MarkerDef[] = [
  {
    position: [-1.8, 1.68, 0.0],
    size: [0.9, 0.3, 0.8],
    label: 'CRACK',
    confidence: '0.83',
    color: '#EF4444',
  },
  {
    position: [-0.1, 1.68, 0.05],
    size: [0.7, 0.3, 0.65],
    label: 'CRACK',
    confidence: '0.71',
    color: '#F97316',
  },
  {
    position: [1.52, 1.68, 0.0],
    size: [0.55, 0.3, 0.5],
    label: 'CRACK',
    confidence: '0.58',
    color: '#F97316',
  },
];

function WireBox({
  position,
  size,
  color,
  phaseOffset = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  phaseOffset?: number;
}) {
  const ref = useRef<THREE.LineSegments>(null!);
  const matRef = useRef<THREE.LineBasicMaterial>(null!);
  const t = useRef(phaseOffset);

  useFrame((_, delta) => {
    t.current += delta;
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(t.current * 1.8) * 0.3;
    }
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t.current * 0.8) * 0.015;
    }
  });

  const geo = new THREE.BoxGeometry(...size);
  const edges = new THREE.EdgesGeometry(geo);

  return (
    <lineSegments ref={ref} geometry={edges} position={position}>
      <lineBasicMaterial ref={matRef} color={color} transparent opacity={0.7} depthWrite={false} />
    </lineSegments>
  );
}

export function InspectionMarkers() {
  return (
    <group>
      {MARKERS.map((m, i) => (
        <WireBox
          key={i}
          position={m.position}
          size={m.size}
          color={m.color}
          phaseOffset={i * 1.3}
        />
      ))}
    </group>
  );
}

// Export marker data so the HTML overlay layer can position labels
export { MARKERS };
export type { MarkerDef };
