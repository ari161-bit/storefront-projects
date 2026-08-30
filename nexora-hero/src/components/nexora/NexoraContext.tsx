'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NodeId } from '@/lib/nexora/config';

export type PerfTier = 'high' | 'low';

interface NexoraState {
  hoveredId: NodeId | null;
  activeId: NodeId | null;
  focusId: NodeId | null;
  setHovered: (id: NodeId | null) => void;
  /** Click-to-toggle: selecting the already-active node clears it. Used by the nodes themselves. */
  setActive: (id: NodeId | null) => void;
  /** Sets the active node directly, no toggle — for programmatic control from outside the canvas. */
  activateNode: (id: NodeId | null) => void;
  /** Bumped on every click so the particle system can play a short "energy burst" on the touched links. */
  burstRef: React.MutableRefObject<Record<string, number>>;
  perfTier: PerfTier;
  reducedMotion: boolean;
}

const NexoraCtx = createContext<NexoraState | null>(null);

export function useNexora() {
  const ctx = useContext(NexoraCtx);
  if (!ctx) throw new Error('useNexora must be used within <NexoraProvider>');
  return ctx;
}

export function NexoraProvider({
  children,
  perfTier,
  reducedMotion,
}: {
  children: ReactNode;
  perfTier: PerfTier;
  reducedMotion: boolean;
}) {
  const [hoveredId, setHoveredId] = useState<NodeId | null>(null);
  const [activeId, setActiveId] = useState<NodeId | null>(null);
  const burstRef = useRef<Record<string, number>>({});

  const activateNode = useCallback((id: NodeId | null) => {
    if (id) burstRef.current[id] = performance.now();
    setActiveId(id);
  }, []);

  const setActive = useCallback((id: NodeId | null) => {
    setActiveId((current) => {
      const next = current === id ? null : id;
      if (next) burstRef.current[next] = performance.now();
      return next;
    });
  }, []);

  const value = useMemo<NexoraState>(
    () => ({
      hoveredId,
      activeId,
      focusId: activeId ?? hoveredId,
      setHovered: setHoveredId,
      setActive,
      activateNode,
      burstRef,
      perfTier,
      reducedMotion,
    }),
    [hoveredId, activeId, perfTier, reducedMotion, setActive, activateNode],
  );

  return <NexoraCtx.Provider value={value}>{children}</NexoraCtx.Provider>;
}
