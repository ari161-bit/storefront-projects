'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { NODES } from '@/lib/nexora/config';
import { PALETTE } from '@/lib/nexora/palette';
import Node from './Node';
import Connections from './Connections';
import Background from './Background';
import CameraRig from './CameraRig';
import DebugProjector from './DebugProjector';
import { useNexora } from './NexoraContext';

// Shifts the whole network toward the right of the frame, keeping the left side
// visually quiet so landing-page copy can sit over it.
const ROOT_OFFSET: [number, number, number] = [3.5, -0.15, 0];

export default function Scene() {
  const { perfTier, reducedMotion } = useNexora();
  const rootRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (rootRef.current) {
      rootRef.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.05) * 0.03;
    }
  });

  return (
    <>
      <Background perfTier={perfTier} />

      <ambientLight intensity={0.18} color={PALETTE.deepTeal} />
      <directionalLight position={[-4, 3, 3]} intensity={1.1} color={PALETTE.mint} />
      <directionalLight position={[4, -1.5, -2]} intensity={0.6} color={PALETTE.coral} />
      <pointLight position={[1.5, 0.6, 1.5]} intensity={1.4} color={PALETTE.yellow} distance={6} decay={2} />
      <pointLight position={[0, -3, 2]} intensity={0.35} color={PALETTE.ivory} distance={8} decay={2} />

      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} color={PALETTE.mint} position={[-4, 3, 2]} scale={[4, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color={PALETTE.coral} position={[4, -2, -3]} scale={[3, 3, 1]} />
        <Lightformer form="rect" intensity={2} color={PALETTE.yellow} position={[0, 4, -2]} scale={[3, 3, 1]} />
        <Lightformer form="ring" intensity={0.5} color={PALETTE.ivory} position={[0, -4, 4]} scale={[6, 6, 1]} />
      </Environment>

      <group ref={rootRef} name="NEXORA_ROOT" position={ROOT_OFFSET}>
        {NODES.map((n) => (
          <Node key={n.id} config={n} />
        ))}
        <Connections perfTier={perfTier} />
      </group>

      <CameraRig rootOffset={ROOT_OFFSET} />
      <DebugProjector />
    </>
  );
}
