import type { NodeId } from './config';

/**
 * Live world positions of every node, keyed by id. Populated by each <Node> every frame
 * (mutated in place, no per-frame allocation) and projected to screen space by
 * <DebugProjector> in Scene.tsx. Consumed only by headless verification via
 * `window.__NEXORA_NODE_SCREEN_POS__` — not part of the public component API.
 */
export const nodeWorldPositions: Partial<Record<NodeId, [number, number, number]>> = {};
