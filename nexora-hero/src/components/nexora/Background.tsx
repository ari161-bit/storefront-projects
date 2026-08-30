'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '@/lib/nexora/palette';
import { hashRandom, hashSpread } from '@/lib/nexora/rand';
import { useNexora } from './NexoraContext';

function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const ivory = new THREE.Color(PALETTE.ivory);
    const mint = new THREE.Color(PALETTE.mint);
    for (let i = 0; i < count; i++) {
      const radius = 9 + hashRandom(i * 12.9898) * 14;
      const theta = hashRandom(i * 78.233 + 1) * Math.PI * 2;
      const phi = Math.acos(hashRandom(i * 39.425 + 2) * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = -Math.abs(radius * Math.cos(phi)) - 3;

      const c = hashRandom(i * 4.678 + 3) > 0.82 ? mint : ivory;
      const dim = 0.35 + hashRandom(i * 93.11 + 4) * 0.4;
      colors[i * 3] = c.r * dim;
      colors[i * 3 + 1] = c.g * dim;
      colors[i * 3 + 2] = c.b * dim;

      sizes[i] = hashRandom(i * 17.13 + 5) * 1.6 + 0.4;
    }
    return { positions, colors, sizes };
  }, [count]);
  const { reducedMotion } = useNexora();

  useFrame(({ clock }) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y = clock.elapsedTime * 0.006;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function DustMotes({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = hashSpread(i * 11.7 + 10, 9);
      arr[i * 3 + 1] = hashSpread(i * 63.2 + 11, 7);
      arr[i * 3 + 2] = hashSpread(i * 27.4 + 12, 5) - 1;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.02) * 0.05;
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.08) * 0.15;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={PALETTE.mint}
        transparent
        opacity={0.18}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** A faint, far-away grid — reads as "premium digital environment", not a game floor. */
function FaintGrid() {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => {
    const size = 22;
    const divisions = 22;
    const points: number[] = [];
    const step = size / divisions;
    for (let i = 0; i <= divisions; i++) {
      const p = -size / 2 + i * step;
      points.push(-size / 2, p, 0, size / 2, p, 0);
      points.push(p, -size / 2, 0, p, size / 2, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, []);

  return (
    <lineSegments ref={ref} geometry={geometry} position={[0, 0, -8]} rotation={[0, 0.15, 0]}>
      <lineBasicMaterial color={PALETTE.mint} transparent opacity={0.045} toneMapped={false} />
    </lineSegments>
  );
}

export default function Background({ perfTier }: { perfTier: 'high' | 'low' }) {
  const { reducedMotion } = useNexora();
  return (
    <group name="NEXORA_BACKGROUND">
      <color attach="background" args={[PALETTE.deepTeal]} />
      <fog attach="fog" args={[PALETTE.deepTeal, 8, 20]} />
      <Starfield count={perfTier === 'high' ? 900 : 350} />
      {perfTier === 'high' && !reducedMotion && <DustMotes count={140} />}
      <FaintGrid />
    </group>
  );
}
