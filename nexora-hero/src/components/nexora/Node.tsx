'use client';

import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { NexoraNodeConfig } from '@/lib/nexora/config';
import { useNexora } from './NexoraContext';
import { PALETTE } from '@/lib/nexora/palette';
import { hashRandom, seedFromString } from '@/lib/nexora/rand';
import { nodeWorldPositions } from '@/lib/nexora/debugRegistry';

type EnergyRef = MutableRefObject<number>;

/** All per-frame glow updates read this ref instead of a React prop, so hover/click
 *  animation never triggers a React re-render — only Three.js objects are touched. */
function useEnergyMaterial(energyRef: EnergyRef, base: number, range: number) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (ref.current) ref.current.emissiveIntensity = base + energyRef.current * range;
  });
  return ref;
}

/** Shared "glass over brushed metal" shell used by every node, tinted per-accent. */
function NodeShell({
  accent,
  radius,
  height,
  segments,
}: {
  accent: string;
  radius: number;
  height: number;
  segments: number;
}) {
  return (
    <group>
      <mesh castShadow={false} receiveShadow={false}>
        <cylinderGeometry args={[radius, radius * 0.96, height, segments]} />
        <meshPhysicalMaterial
          color={PALETTE.darkSurface}
          metalness={0.75}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.2}
          envMapIntensity={1.1}
        />
      </mesh>
      <mesh position={[0, height * 0.51, 0]}>
        <cylinderGeometry args={[radius * 0.86, radius * 0.86, height * 0.06, segments]} />
        <meshPhysicalMaterial
          color={accent}
          transmission={1}
          thickness={0.4}
          roughness={0.06}
          ior={1.45}
          metalness={0}
          envMapIntensity={1.4}
          transparent
        />
      </mesh>
    </group>
  );
}

function GlowCore({
  accent,
  radius,
  energyRef,
  base,
  range,
}: {
  accent: string;
  radius: number;
  energyRef: EnergyRef;
  base: number;
  range: number;
}) {
  const matRef = useEnergyMaterial(energyRef, base, range);
  return (
    <mesh>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial ref={matRef} color={accent} emissive={accent} emissiveIntensity={base} roughness={0.3} toneMapped={false} />
    </mesh>
  );
}

interface GeoProps {
  accent: string;
  secondary: string;
  energyRef: EnergyRef;
}

function InstagramGeo({ accent, secondary, energyRef }: GeoProps) {
  const ringMat = useEnergyMaterial(energyRef, 0.5, 0.8);
  return (
    <group>
      <NodeShell accent={accent} radius={0.42} height={0.16} segments={48} />
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.024, 16, 48]} />
        <meshStandardMaterial ref={ringMat} color={secondary} emissive={accent} emissiveIntensity={0.5} roughness={0.35} toneMapped={false} />
      </mesh>
      <GlowCore accent={accent} radius={0.07} energyRef={energyRef} base={1.4} range={1.6} />
    </group>
  );
}

function WhatsAppGeo({ accent, energyRef }: GeoProps) {
  const dotMat = useEnergyMaterial(energyRef, 1.8, 1.8);
  return (
    <group>
      <NodeShell accent={accent} radius={0.4} height={0.42} segments={32} />
      <mesh position={[0.12, 0.32, 0.22]}>
        <sphereGeometry args={[0.065, 20, 20]} />
        <meshStandardMaterial ref={dotMat} color={accent} emissive={accent} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CrmGeo({ accent, secondary, energyRef }: GeoProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const orbMat = useEnergyMaterial(energyRef, 1, 1);
  const ringMat = useEnergyMaterial(energyRef, 0.6, 0.6);
  useFrame((_, delta) => {
    if (orbitRef.current) orbitRef.current.rotation.y += delta * 0.6;
  });
  return (
    <group>
      <NodeShell accent={accent} radius={0.44} height={0.18} segments={48} />
      <group ref={orbitRef} position={[0, 0.14, 0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24]}>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshStandardMaterial ref={i === 0 ? orbMat : undefined} color={secondary} emissive={secondary} emissiveIntensity={1} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.012, 12, 48]} />
        <meshStandardMaterial ref={ringMat} color={secondary} emissive={secondary} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <GlowCore accent={accent} radius={0.06} energyRef={energyRef} base={1.2} range={1.4} />
    </group>
  );
}

function FollowupGeo({ accent, secondary, energyRef }: GeoProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const dotMat = useEnergyMaterial(energyRef, 1.6, 1.6);
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
      pulseRef.current.scale.setScalar(s);
    }
  });
  return (
    <group>
      <NodeShell accent={accent} radius={0.38} height={0.34} segments={32} />
      <mesh ref={pulseRef} position={[0.18, 0.2, 0.16]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial ref={dotMat} color={secondary} emissive={secondary} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function AppointmentGeo({ accent, secondary, energyRef }: GeoProps) {
  const ringMat = useEnergyMaterial(energyRef, 0.8, 1);
  return (
    <group>
      <NodeShell accent={accent} radius={0.4} height={0.3} segments={4} />
      <mesh position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <torusGeometry args={[0.22, 0.014, 8, 4]} />
        <meshStandardMaterial ref={ringMat} color={secondary} emissive={secondary} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <GlowCore accent={accent} radius={0.055} energyRef={energyRef} base={1.3} range={1.4} />
    </group>
  );
}

function CustomerGeo({ accent, secondary, energyRef }: GeoProps) {
  const haloMat = useEnergyMaterial(energyRef, 0.4, 0.6);
  return (
    <group>
      <NodeShell accent={accent} radius={0.48} height={0.46} segments={40} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[0.34, 0.01, 12, 56]} />
        <meshStandardMaterial ref={haloMat} color={secondary} emissive={secondary} emissiveIntensity={0.4} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <GlowCore accent={accent} radius={0.08} energyRef={energyRef} base={0.9} range={1} />
    </group>
  );
}

function AiCoreGeo({ accent, secondary, energyRef }: GeoProps) {
  const ringRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringMatA = useEnergyMaterial(energyRef, 1.2, 1);
  const ringMatB = useEnergyMaterial(energyRef, 0.9, 0.6);
  const coreMat = useEnergyMaterial(energyRef, 2.6, 2);
  useFrame(({ clock }, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 0.25;
      ringRef.current.rotation.y += delta * 0.4;
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.06;
      coreRef.current.scale.setScalar(pulse);
    }
  });
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.34, 2]} />
        <meshPhysicalMaterial
          color={PALETTE.darkSurface}
          transmission={0.9}
          thickness={0.6}
          roughness={0.08}
          ior={1.5}
          metalness={0.1}
          envMapIntensity={1.6}
          transparent
        />
      </mesh>
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.46, 0.012, 12, 64]} />
          <meshStandardMaterial ref={ringMatA} color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 3, Math.PI / 2]}>
          <torusGeometry args={[0.52, 0.008, 12, 64]} />
          <meshStandardMaterial ref={ringMatB} color={secondary} emissive={secondary} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial ref={coreMat} color={accent} emissive={accent} emissiveIntensity={2.6} roughness={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Node({ config }: { config: NexoraNodeConfig }) {
  const { hoveredId, activeId, setHovered, setActive, reducedMotion } = useNexora();
  const groupRef = useRef<THREE.Group>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef(0);
  const worldPosTmp = useRef(new THREE.Vector3());
  const baseAngle = hashRandom(seedFromString(config.id)) * Math.PI * 2;

  const isHovered = hoveredId === config.id;
  const isActive = activeId === config.id;

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const target = isActive ? 1 : isHovered ? 0.6 : 0;
    energyRef.current = THREE.MathUtils.damp(energyRef.current, target, 4, delta);
    const energy = energyRef.current;

    if (groupRef.current) {
      if (reducedMotion) {
        groupRef.current.position.set(config.position[0], config.position[1], config.position[2]);
      } else {
        const floatY = Math.sin(t * config.floatSpeed + baseAngle) * config.floatAmplitude;
        const floatX = Math.cos(t * config.floatSpeed * 0.8 + baseAngle) * config.floatAmplitude * 0.5;
        groupRef.current.position.set(
          config.position[0] + floatX,
          config.position[1] + floatY,
          config.position[2],
        );
      }
      const targetScale = config.scale * (1 + energy * (config.kind === 'ai' ? 0.12 : 0.22));
      const current = groupRef.current.scale.x;
      const next = THREE.MathUtils.damp(current, targetScale, 6, delta);
      groupRef.current.scale.setScalar(next);

      groupRef.current.getWorldPosition(worldPosTmp.current);
      let slot = nodeWorldPositions[config.id];
      if (!slot) {
        slot = [0, 0, 0];
        nodeWorldPositions[config.id] = slot;
      }
      slot[0] = worldPosTmp.current.x;
      slot[1] = worldPosTmp.current.y;
      slot[2] = worldPosTmp.current.z;
    }

    if (panelRef.current) {
      if (energy < 0.015) {
        panelRef.current.style.display = 'none';
      } else {
        panelRef.current.style.display = 'flex';
        panelRef.current.style.opacity = String(energy);
        panelRef.current.style.transform = `translateY(${(1 - energy) * 6}px) scale(${0.94 + energy * 0.06})`;
      }
    }
  });

  const geoProps: GeoProps = { accent: config.accent, secondary: config.accentSecondary, energyRef };

  return (
    <group
      ref={groupRef}
      position={config.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(config.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        setActive(config.id);
      }}
      name={config.id}
    >
      {/* Invisible larger hit target so small nodes stay easy to hover/click. */}
      <mesh visible={false}>
        <sphereGeometry args={[0.55, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {config.kind === 'ai' && <AiCoreGeo {...geoProps} />}
      {config.kind === 'instagram' && <InstagramGeo {...geoProps} />}
      {config.kind === 'whatsapp' && <WhatsAppGeo {...geoProps} />}
      {config.kind === 'crm' && <CrmGeo {...geoProps} />}
      {config.kind === 'followup' && <FollowupGeo {...geoProps} />}
      {config.kind === 'appointment' && <AppointmentGeo {...geoProps} />}
      {config.kind === 'customer' && <CustomerGeo {...geoProps} />}

      <Html position={[0, config.scale * 0.62 + 0.32, 0]} center occlude={false} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          ref={panelRef}
          role="status"
          aria-label={`${config.label}: ${config.description}`}
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: 2,
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(16, 38, 41, 0.82)',
            border: `1px solid ${config.accent}55`,
            boxShadow: '0 8px 24px rgba(8, 26, 28, 0.45)',
            backdropFilter: 'blur(6px)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-geist-sans, system-ui), sans-serif',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: PALETTE.ivory }}>{config.label}</span>
          <span style={{ fontSize: 10.5, color: config.accent, letterSpacing: 0.2 }}>{config.description}</span>
        </div>
      </Html>
    </group>
  );
}
