'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NODES, findNode } from '@/lib/nexora/config';
import { useNexora } from './NexoraContext';

const BASE_RADIUS = 6.6;
const ELEVATION = 0.27; // radians — a slightly-angled, editorial perspective rather than flat-on
const BASE_AZIMUTH = 0.5;
// Idle motion is a slow SWAY, not a full orbit — a 360° rotation would eventually swing every
// node across the whole screen, including into the hero copy on the left. Bounded instead.
const IDLE_SWAY_AMPLITUDE = 0.15; // rad
const IDLE_SWAY_SPEED = 0.12; // rad/s (a full sway cycle takes ~52s)
// Clamp keeps a focused node's reframing from swinging the *other* nodes into the copy column.
const AZIMUTH_MIN = BASE_AZIMUTH - 0.22;
const AZIMUTH_MAX = BASE_AZIMUTH + 0.38;

export default function CameraRig({ rootOffset }: { rootOffset: [number, number, number] }) {
  const { camera, pointer } = useThree();
  const { focusId, activeId, reducedMotion } = useNexora();

  const center = useMemo(() => {
    const avg = new THREE.Vector3();
    NODES.forEach((n) => avg.add(new THREE.Vector3(...n.position)));
    avg.divideScalar(NODES.length);
    avg.add(new THREE.Vector3(...rootOffset));
    return avg;
  }, [rootOffset]);

  const azimuth = useRef(BASE_AZIMUTH);
  const radius = useRef(BASE_RADIUS);
  const target = useRef(center.clone());

  // Scratch vectors reused every frame — no per-frame allocation.
  const desiredTarget = useRef(new THREE.Vector3());
  const nodeWorldPos = useRef(new THREE.Vector3());

  useFrame(({ clock }, delta) => {
    const focused = focusId !== null;
    const desiredRadius = focused ? BASE_RADIUS * (activeId ? 0.78 : 0.88) : BASE_RADIUS;
    radius.current = THREE.MathUtils.damp(radius.current, desiredRadius, 3.2, delta);

    if (focused) {
      const node = findNode(focusId!);
      nodeWorldPos.current.set(
        node.position[0] + rootOffset[0],
        node.position[1] + rootOffset[1],
        node.position[2] + rootOffset[2],
      );
      desiredTarget.current.copy(center).lerp(nodeWorldPos.current, 0.7);
      // Defense-in-depth: whatever node is focused, never let the look-at target drift far
      // vertically from the cluster's center — large swings there can tip the camera into a
      // near-degenerate angle that scrambles left/right composition for every other node.
      desiredTarget.current.y = THREE.MathUtils.clamp(desiredTarget.current.y, center.y - 1, center.y + 1);
    } else {
      desiredTarget.current.copy(center);
    }
    target.current.lerp(desiredTarget.current, 1 - Math.pow(0.001, delta));

    if (focused) {
      const node = findNode(focusId!);
      const rawAzimuth = Math.atan2(node.position[0], node.position[2]) * 0.6 + BASE_AZIMUTH;
      const desiredAzimuth = THREE.MathUtils.clamp(rawAzimuth, AZIMUTH_MIN, AZIMUTH_MAX);
      azimuth.current = THREE.MathUtils.damp(azimuth.current, desiredAzimuth, 2, delta);
    } else if (!reducedMotion) {
      const idleAzimuth = BASE_AZIMUTH + Math.sin(clock.elapsedTime * IDLE_SWAY_SPEED) * IDLE_SWAY_AMPLITUDE;
      azimuth.current = THREE.MathUtils.damp(azimuth.current, idleAzimuth, 2, delta);
    }

    const horizontal = radius.current * Math.cos(ELEVATION);
    const x = target.current.x + horizontal * Math.sin(azimuth.current);
    const z = target.current.z + horizontal * Math.cos(azimuth.current);
    const y = target.current.y + radius.current * Math.sin(ELEVATION);

    // Very subtle parallax so the scene reads as interactive, never a full orbit-drag.
    const parallaxScale = reducedMotion ? 0 : 1;
    const parallaxX = pointer.x * 0.12 * parallaxScale;
    const parallaxY = pointer.y * 0.08 * parallaxScale;

    camera.position.set(x + parallaxX, y + parallaxY, z);
    camera.lookAt(target.current);
  });

  return null;
}
