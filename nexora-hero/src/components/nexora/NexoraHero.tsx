'use client';

import { Suspense, forwardRef, useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { NexoraProvider, useNexora, type PerfTier } from './NexoraContext';
import type { NodeId } from '@/lib/nexora/config';
import Scene from './Scene';
import { PALETTE } from '@/lib/nexora/palette';

function useAutoPerfTier(override: 'auto' | PerfTier): PerfTier {
  const [tier, setTier] = useState<PerfTier>('high');

  useEffect(() => {
    if (override !== 'auto') return;
    const compute = () => {
      const narrow = window.innerWidth < 820;
      const lowDpr = window.devicePixelRatio < 1.25;
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setTier(narrow || (coarsePointer && lowDpr) ? 'low' : 'high');
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [override]);

  return override === 'auto' ? tier : override;
}

function useAutoReducedMotion(override: 'auto' | boolean): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (override !== 'auto') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compute = () => setReduced(mq.matches);
    compute();
    mq.addEventListener('change', compute);
    return () => mq.removeEventListener('change', compute);
  }, [override]);

  return override === 'auto' ? reduced : override;
}

function PostFX() {
  const { perfTier } = useNexora();
  if (perfTier === 'low') return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.72}
        luminanceSmoothing={0.28}
        intensity={0.55}
        radius={0.5}
      />
      <Vignette eskil={false} offset={0.28} darkness={0.65} />
    </EffectComposer>
  );
}

export interface NexoraHeroProps {
  className?: string;
  /** Controlled active node — pass to drive the scene's selection from outside (e.g. scroll sync).
   *  Omit and use the imperative handle / internal clicks for uncontrolled use. */
  activeNode?: NodeId | null;
  /** Called whenever the active node changes, whether from a click inside the canvas or from
   *  the `activeNode` prop / imperative handle. */
  onActiveNodeChange?: (id: NodeId | null) => void;
  /** Force reduced motion on/off; defaults to 'auto' (follows prefers-reduced-motion). */
  reducedMotion?: 'auto' | boolean;
  /** Force a performance tier; defaults to 'auto' (based on viewport width, DPR, pointer type). */
  performanceTier?: 'auto' | PerfTier;
}

/** Imperative API so the rest of the site can drive the scene — e.g. highlight AI_CORE
 *  while a headline about NEXORA AI is in view, without lifting canvas state into React props. */
export interface NexoraHeroHandle {
  setActiveNode: (id: NodeId | null) => void;
  getActiveNode: () => NodeId | null;
}

function HeroCanvas({ perfTier }: { perfTier: PerfTier }) {
  const { setActive } = useNexora();
  return (
    <Canvas
      dpr={perfTier === 'high' ? [1, 1.8] : [1, 1.2]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 42, near: 0.1, far: 40, position: [4, 1, 6] }}
      onPointerMissed={() => setActive(null)}
    >
      <Suspense fallback={null}>
        <Scene />
        <PostFX />
      </Suspense>
    </Canvas>
  );
}

/** Bridges the internal context (only reachable inside <NexoraProvider>) out to the
 *  forwardRef handle, the controlled `activeNode` prop, and the onActiveNodeChange callback. */
function ImperativeBridge({
  handleRef,
  activeNode,
  onActiveNodeChange,
}: {
  handleRef: Ref<NexoraHeroHandle>;
  activeNode?: NodeId | null;
  onActiveNodeChange?: (id: NodeId | null) => void;
}) {
  const { activeId, activateNode } = useNexora();

  useImperativeHandle(
    handleRef,
    () => ({
      setActiveNode: activateNode,
      getActiveNode: () => activeId,
    }),
    [activateNode, activeId],
  );

  // Controlled mode: external `activeNode` prop pushes into the canvas.
  useEffect(() => {
    if (activeNode !== undefined && activeNode !== activeId) activateNode(activeNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNode]);

  // Uncontrolled + controlled: internal changes always propagate out.
  useEffect(() => {
    onActiveNodeChange?.(activeId);
  }, [activeId, onActiveNodeChange]);

  return null;
}

const NexoraHero = forwardRef<NexoraHeroHandle, NexoraHeroProps>(function NexoraHero(
  { className, activeNode, onActiveNodeChange, reducedMotion = 'auto', performanceTier = 'auto' },
  ref,
) {
  const perfTier = useAutoPerfTier(performanceTier);
  const reduced = useAutoReducedMotion(reducedMotion);

  useEffect(() => {
    // Exposed for automated / headless verification only — not part of the public API.
    (window as unknown as Record<string, unknown>).__NEXORA_PERF_TIER__ = perfTier;
    (window as unknown as Record<string, unknown>).__NEXORA_REDUCED_MOTION__ = reduced;
  }, [perfTier, reduced]);

  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, background: PALETTE.deepTeal }}
      aria-label="NEXORA AI conversation network — interactive 3D visualization"
    >
      <NexoraProvider perfTier={perfTier} reducedMotion={reduced}>
        <ImperativeBridge handleRef={ref ?? null} activeNode={activeNode} onActiveNodeChange={onActiveNodeChange} />
        <HeroCanvas perfTier={perfTier} />
      </NexoraProvider>
    </div>
  );
});

export default NexoraHero;
