/**
 * CameraRig — scroll-driven cinematic camera.
 *
 * The camera travels through a sequence of keyframe positions mapped
 * to scroll progress [0, 1].  Movement is eased with smooth-step and
 * lerped each frame for natural deceleration — no abrupt cuts.
 *
 * A very small pointer-parallax offset is added on top of the scroll
 * position so the scene always feels alive even when the user pauses.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Keyframe {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
}

// Cinematic camera path.  Each keyframe: scroll progress → position → lookAt target.
// The structure is centred at ~[0, 1.2, 0] so the camera moves around that origin.
const KEYFRAMES: Keyframe[] = [
  { p: 0.00, pos: [0.0, 3.2, 11.0], look: [0, 0.6, 0] },   // far, slightly elevated
  { p: 0.10, pos: [0.0, 2.6,  8.0], look: [0, 0.6, 0] },   // approaching
  { p: 0.22, pos: [0.4, 2.0,  5.0], look: [0, 0.9, 0] },   // closer, slight offset
  { p: 0.32, pos: [0.6, 1.6,  3.2], look: [0, 1.1, 0] },   // close to surface
  { p: 0.42, pos: [0.0, 1.45, 2.4], look: [0, 1.2, 0] },   // surface / scan begins
  { p: 0.54, pos: [-0.4, 1.4, 2.2], look: [0, 1.15, 0] },  // scan continues
  { p: 0.64, pos: [1.8, 2.2,  5.0], look: [0, 0.8, 0] },   // pull back, angle shift
  { p: 0.73, pos: [0.0, 2.8,  7.5], look: [0, 0.5, 0] },   // modules overview
  { p: 0.87, pos: [0.0, 3.4, 10.0], look: [0, 0.0, 0] },   // pull back to CTA
  { p: 1.00, pos: [0.0, 3.4, 10.0], look: [0, 0.0, 0] },   // hold
];

function smoothStep(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function interpKeyframes(p: number) {
  const kf = KEYFRAMES;
  if (p <= kf[0].p) return { pos: kf[0].pos, look: kf[0].look };
  const last = kf[kf.length - 1];
  if (p >= last.p) return { pos: last.pos, look: last.look };

  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (p >= a.p && p <= b.p) {
      const t = smoothStep((p - a.p) / (b.p - a.p));
      return {
        pos: [
          a.pos[0] + (b.pos[0] - a.pos[0]) * t,
          a.pos[1] + (b.pos[1] - a.pos[1]) * t,
          a.pos[2] + (b.pos[2] - a.pos[2]) * t,
        ] as [number, number, number],
        look: [
          a.look[0] + (b.look[0] - a.look[0]) * t,
          a.look[1] + (b.look[1] - a.look[1]) * t,
          a.look[2] + (b.look[2] - a.look[2]) * t,
        ] as [number, number, number],
      };
    }
  }
  return { pos: last.pos, look: last.look };
}

interface CameraRigProps {
  scrollRef: React.MutableRefObject<number>;
}

export function CameraRig({ scrollRef }: CameraRigProps) {
  const { camera, mouse } = useThree();
  const curPos  = useRef(new THREE.Vector3(0, 3.2, 11));
  const curLook = useRef(new THREE.Vector3(0, 0.6, 0));
  const tgtPos  = useRef(new THREE.Vector3());
  const tgtLook = useRef(new THREE.Vector3());

  useFrame(() => {
    const { pos, look } = interpKeyframes(scrollRef.current);

    // Very subtle pointer parallax on top of the scroll path
    const px = mouse.x * 0.18;
    const py = mouse.y * 0.08;

    tgtPos.current.set(pos[0] + px, pos[1] + py, pos[2]);
    tgtLook.current.set(look[0], look[1], look[2]);

    curPos.current.lerp(tgtPos.current, 0.042);
    curLook.current.lerp(tgtLook.current, 0.042);

    camera.position.copy(curPos.current);
    camera.lookAt(curLook.current);
  });

  return null;
}
