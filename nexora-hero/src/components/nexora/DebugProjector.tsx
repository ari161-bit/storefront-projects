'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NODES } from '@/lib/nexora/config';
import { nodeWorldPositions } from '@/lib/nexora/debugRegistry';

type ScreenPos = { x: number; y: number; visible: boolean };

/** Projects every node's live world position to canvas-relative screen pixels, throttled to
 *  ~12fps, and exposes it on `window.__NEXORA_NODE_SCREEN_POS__`. Used only by headless
 *  verification (scripts/verify.mjs) to click exact node positions — not a public API,
 *  and cheap enough (7 projections, a few times a second) to leave mounted always. */
export default function DebugProjector() {
  const { camera, gl } = useThree();
  const ndcTmp = useRef(new THREE.Vector3());
  const frameCount = useRef(0);

  useFrame(() => {
    frameCount.current += 1;
    if (frameCount.current % 5 !== 0) return;
    if (typeof window === 'undefined') return;

    const rect = gl.domElement.getBoundingClientRect();
    const out: Partial<Record<string, ScreenPos>> = {};

    for (const node of NODES) {
      const world = nodeWorldPositions[node.id];
      if (!world) continue;
      ndcTmp.current.set(world[0], world[1], world[2]).project(camera);
      out[node.id] = {
        x: rect.left + ((ndcTmp.current.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - ndcTmp.current.y) / 2) * rect.height,
        visible: ndcTmp.current.z < 1,
      };
    }

    (window as unknown as Record<string, unknown>).__NEXORA_NODE_SCREEN_POS__ = out;
  });

  return null;
}
