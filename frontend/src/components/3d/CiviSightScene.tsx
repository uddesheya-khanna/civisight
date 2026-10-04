/**
 * CiviSightScene — root scene orchestrator.
 *
 * Composes all 3D components and passes the shared scrollRef
 * to each so they can read scroll progress inside useFrame
 * without triggering React re-renders.
 */
import { SceneLighting }       from './SceneLighting';
import { InfrastructureModel } from './InfrastructureModel';
import { ScanBeam }            from './ScanBeam';
import { TechnicalGrid }       from './TechnicalGrid';
import { CameraRig }           from './CameraRig';

interface CiviSightSceneProps {
  scrollRef: React.MutableRefObject<number>;
}

export function CiviSightScene({ scrollRef }: CiviSightSceneProps) {
  return (
    <>
      <SceneLighting       scrollRef={scrollRef} />
      <InfrastructureModel scrollRef={scrollRef} />
      <ScanBeam            scrollRef={scrollRef} />
      <TechnicalGrid       scrollRef={scrollRef} />
      <CameraRig           scrollRef={scrollRef} />
    </>
  );
}
