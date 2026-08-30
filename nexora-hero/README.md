# NEXORA — Interactive 3D Hero Network

A cinematic, dark deep-teal 3D hero scene built with **Next.js 16 (App Router) + React Three Fiber**.
It visualizes NEXORA's story — Instagram + WhatsApp conversations flowing through one AI brain and
becoming organized, followed-up, booked customers — as a constellation of seven connected nodes.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Hover a node for its label + description; click to focus the camera on it
and boost its connections' particle flow; click empty space (or the same node again) to release focus.

## Structure

```
src/
  lib/nexora/
    palette.ts   Brand color tokens (deep teal, dark surface, coral, mint, yellow, ivory)
    config.ts    NODES (7 nodes: position, accent, scale, kind) + LINKS (7 directed connections)
    rand.ts      Deterministic pseudo-random helpers (no Math.random — keeps geometry pure/stable)

  components/nexora/
    NexoraContext.tsx   hover/active/focus state + perf tier, shared by canvas and HTML overlay
    NexoraHero.tsx       Public entry point: <Canvas>, postprocessing, responsive perf tier,
                         forwardRef imperative API (setActiveNode/getActiveNode)
    Scene.tsx            Lighting, environment lightformers, NEXORA_ROOT group assembly
    Node.tsx             Per-node geometry (AI core, Instagram, WhatsApp, CRM, Follow-up,
                         Appointment, Customer), hover/click physics, floating HTML info panel
    Connections.tsx      Bezier link lines + instanced traveling particles (head + trail)
    Background.tsx       Deep-teal backdrop, quiet starfield, faint grid, atmospheric dust
    CameraRig.tsx         Slow auto-orbit, eases toward focused node, subtle pointer parallax
```

Scene-graph naming (as requested, for later inspection/automation):
`NEXORA_ROOT > AI_CORE, INSTAGRAM_NODE, WHATSAPP_NODE, CRM_NODE, FOLLOWUP_NODE,
APPOINTMENT_NODE, CUSTOMER_NODE, NEXORA_LINKS > INSTAGRAM_LINK, WHATSAPP_LINK, CRM_LINK,
FOLLOWUP_LINK, APPOINTMENT_LINK, APPOINTMENT_LINK_FOLLOWUP, CUSTOMER_LINK`.

## Embedding in an existing site

```tsx
import NexoraHero from '@/components/nexora/NexoraHero';

// Anywhere with a positioned ancestor (e.g. a `relative` hero section):
<NexoraHero />
```

To drive it from the rest of the page (e.g. highlight `AI_CORE` while a matching headline is in
view), pass a ref and/or a callback:

```tsx
const heroRef = useRef<NexoraHeroHandle>(null);

<NexoraHero ref={heroRef} onActiveNodeChange={(id) => console.log('active:', id)} />

// later:
heroRef.current?.setActiveNode('CRM_NODE');
```

## Performance

`NexoraHero` measures viewport width, DPR, and pointer coarseness once on mount to pick a `perfTier`
(`'high' | 'low'`). On `'low'` (narrow screens / coarse pointers / low-DPR devices): star count and
particle-stream count both drop, dust motes and the bloom/vignette postprocessing pass are skipped
entirely, and DPR is capped lower — the seven nodes, their labels, and the flow all stay intact.

## Customizing

- **Colors**: edit `src/lib/nexora/palette.ts`.
- **Layout / labels / flow**: edit `NODES` and `LINKS` in `src/lib/nexora/config.ts` — positions are
  local to `NEXORA_ROOT` (offset in `Scene.tsx` to keep the network on the right of the hero).
- **Node shape**: each `kind` (`ai`, `instagram`, `whatsapp`, `crm`, `followup`, `appointment`,
  `customer`) has its own geometry function in `Node.tsx`.
