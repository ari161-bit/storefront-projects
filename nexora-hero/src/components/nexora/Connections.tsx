'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { LINKS, NODES, findNode, type NexoraLinkConfig } from '@/lib/nexora/config';
import { useNexora } from './NexoraContext';

const UP = new THREE.Vector3(0, 1, 0);
const FALLBACK = new THREE.Vector3(1, 0, 0);

function buildCurve(link: NexoraLinkConfig) {
  const start = new THREE.Vector3(...findNode(link.from).position);
  const end = new THREE.Vector3(...findNode(link.to).position);
  const dir = end.clone().sub(start);
  const length = dir.length();
  dir.normalize();

  let perp = new THREE.Vector3().crossVectors(dir, UP);
  if (perp.lengthSq() < 1e-4) perp = new THREE.Vector3().crossVectors(dir, FALLBACK);
  perp.normalize();

  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.addScaledVector(perp, link.bow * length);
  mid.addScaledVector(UP, link.bow * length * 0.35);

  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function LinkLine({ link, curve }: { link: NexoraLinkConfig; curve: THREE.QuadraticBezierCurve3 }) {
  const { focusId } = useNexora();
  const points = useMemo(() => curve.getPoints(40), [curve]);
  const isFocused = focusId === link.from || focusId === link.to;
  const dimmed = focusId !== null && !isFocused;

  return (
    <Line
      points={points}
      color={link.color}
      transparent
      lineWidth={isFocused ? 1.6 : 1}
      opacity={dimmed ? 0.08 : isFocused ? 0.65 : 0.28}
      toneMapped={false}
    />
  );
}

const STREAM_COUNT_HIGH = 3;
const STREAM_COUNT_LOW = 1;

function LinkParticles({ link, curve, perfTier }: { link: NexoraLinkConfig; curve: THREE.QuadraticBezierCurve3; perfTier: 'high' | 'low' }) {
  const { focusId, burstRef, reducedMotion } = useNexora();
  const streams = perfTier === 'high' && !reducedMotion ? STREAM_COUNT_HIGH : STREAM_COUNT_LOW;
  const instancesPerStream = 2; // head + soft trail
  const count = streams * instancesPerStream;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pointTmp = useMemo(() => new THREE.Vector3(), []);
  const colorTmp = useMemo(() => new THREE.Color(), []);
  const color = useMemo(() => new THREE.Color(link.color), [link.color]);
  const bright = useMemo(() => color.clone().lerp(new THREE.Color('#ffffff'), 0.55), [color]);

  const meta = useMemo(
    () =>
      Array.from({ length: streams }, (_, i) => ({
        phase: i / streams,
        speed: 0.16 + (i % 3) * 0.03,
        isBright: i % 4 === 0,
      })),
    [streams],
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const isFocused = focusId === link.from || focusId === link.to;
    const dimmed = focusId !== null && !isFocused;

    const burstFrom = burstRef.current[link.from];
    const burstTo = burstRef.current[link.to];
    const since = Math.min(
      burstFrom ? performance.now() - burstFrom : Infinity,
      burstTo ? performance.now() - burstTo : Infinity,
    );
    const burst = since < 1400 ? 1 - since / 1400 : 0;

    let idx = 0;
    for (const s of meta) {
      const speed = s.speed * (1 + burst * 1.6) * (reducedMotion ? 0.2 : 1);
      for (let trail = 0; trail < instancesPerStream; trail++) {
        const trailOffset = trail * 0.025;
        const localT = ((t * speed + s.phase - trailOffset) % 1 + 1) % 1;
        curve.getPoint(localT, pointTmp);
        dummy.position.copy(pointTmp);
        const scale = (trail === 0 ? 1 : 0.55) * (isFocused ? 1.3 : 1) * (dimmed ? 0.6 : 1);
        dummy.scale.setScalar(0.028 * scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);
        const c = s.isBright ? bright : color;
        const alpha = (trail === 0 ? 1 : 0.4) * (dimmed ? 0.5 : 1);
        colorTmp.copy(c).multiplyScalar(alpha);
        meshRef.current.setColorAt(idx, colorTmp);
        idx++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export default function Connections({ perfTier }: { perfTier: 'high' | 'low' }) {
  const curves = useMemo(() => LINKS.map((link) => ({ link, curve: buildCurve(link) })), []);

  return (
    <group name="NEXORA_LINKS">
      {curves.map(({ link, curve }) => (
        <group key={link.id} name={link.id}>
          <LinkLine link={link} curve={curve} />
          <LinkParticles link={link} curve={curve} perfTier={perfTier} />
        </group>
      ))}
    </group>
  );
}

// Re-exported so other modules (e.g. camera rig) can reason about node adjacency without recomputation.
export function nodeIds() {
  return NODES.map((n) => n.id);
}
