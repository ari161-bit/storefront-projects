import { PALETTE } from './palette';

export type NodeId =
  | 'AI_CORE'
  | 'INSTAGRAM_NODE'
  | 'WHATSAPP_NODE'
  | 'CRM_NODE'
  | 'FOLLOWUP_NODE'
  | 'APPOINTMENT_NODE'
  | 'CUSTOMER_NODE';

export type NodeKind =
  | 'ai'
  | 'instagram'
  | 'whatsapp'
  | 'crm'
  | 'followup'
  | 'appointment'
  | 'customer';

export interface NexoraNodeConfig {
  id: NodeId;
  kind: NodeKind;
  label: string;
  description: string;
  /** Position relative to NEXORA_ROOT, in world units. */
  position: [number, number, number];
  accent: string;
  accentSecondary: string;
  /** Relative size multiplier — AI_CORE and CUSTOMER_NODE read as the most important. */
  scale: number;
  /** How strongly this node drifts in the idle floating animation. */
  floatAmplitude: number;
  floatSpeed: number;
}

export const NODES: NexoraNodeConfig[] = [
  {
    id: 'AI_CORE',
    kind: 'ai',
    label: 'NEXORA AI',
    description: 'Understands intent',
    position: [0, 0.55, 0],
    accent: PALETTE.yellow,
    accentSecondary: PALETTE.mint,
    scale: 1.15,
    floatAmplitude: 0.05,
    floatSpeed: 0.35,
  },
  {
    id: 'INSTAGRAM_NODE',
    kind: 'instagram',
    label: 'Instagram',
    description: 'Customer conversations',
    position: [-0.35, 2.25, -0.7],
    accent: PALETTE.coral,
    accentSecondary: PALETTE.ivory,
    scale: 0.78,
    floatAmplitude: 0.12,
    floatSpeed: 0.5,
  },
  {
    id: 'WHATSAPP_NODE',
    kind: 'whatsapp',
    label: 'WhatsApp',
    description: 'Business messages',
    position: [0.81, 2.45, 0.5],
    accent: PALETTE.mint,
    accentSecondary: PALETTE.ivory,
    scale: 0.78,
    floatAmplitude: 0.12,
    floatSpeed: 0.46,
  },
  {
    id: 'CRM_NODE',
    kind: 'crm',
    label: 'AI CRM',
    description: 'Organizes leads',
    position: [1.41, 0.55, 1.05],
    accent: PALETTE.mint,
    accentSecondary: PALETTE.yellow,
    scale: 0.82,
    floatAmplitude: 0.1,
    floatSpeed: 0.4,
  },
  {
    id: 'FOLLOWUP_NODE',
    kind: 'followup',
    label: 'Follow-up',
    description: 'Never forgotten',
    position: [0.1, -0.35, 0.5],
    accent: PALETTE.coral,
    accentSecondary: PALETTE.yellow,
    scale: 0.74,
    floatAmplitude: 0.11,
    floatSpeed: 0.44,
  },
  {
    id: 'APPOINTMENT_NODE',
    kind: 'appointment',
    label: 'Appointment',
    description: 'Turns intent into action',
    position: [0.33, -1.65, 0.55],
    accent: PALETTE.yellow,
    accentSecondary: PALETTE.mint,
    scale: 0.8,
    floatAmplitude: 0.1,
    floatSpeed: 0.42,
  },
  {
    id: 'CUSTOMER_NODE',
    kind: 'customer',
    label: 'Customer',
    description: 'Conversation → customer',
    position: [1.17, -1.9, -0.25],
    accent: PALETTE.ivory,
    accentSecondary: PALETTE.mint,
    scale: 0.95,
    floatAmplitude: 0.07,
    floatSpeed: 0.3,
  },
];

export interface NexoraLinkConfig {
  id: string;
  from: NodeId;
  to: NodeId;
  /** Bend the connecting curve out of the straight line by this much, for a constellation feel. */
  bow: number;
  color: string;
}

export const LINKS: NexoraLinkConfig[] = [
  { id: 'INSTAGRAM_LINK', from: 'INSTAGRAM_NODE', to: 'AI_CORE', bow: 0.35, color: PALETTE.coral },
  { id: 'WHATSAPP_LINK', from: 'WHATSAPP_NODE', to: 'AI_CORE', bow: 0.32, color: PALETTE.mint },
  { id: 'CRM_LINK', from: 'AI_CORE', to: 'CRM_NODE', bow: 0.3, color: PALETTE.mint },
  { id: 'FOLLOWUP_LINK', from: 'AI_CORE', to: 'FOLLOWUP_NODE', bow: 0.3, color: PALETTE.coral },
  { id: 'APPOINTMENT_LINK', from: 'CRM_NODE', to: 'APPOINTMENT_NODE', bow: 0.28, color: PALETTE.yellow },
  { id: 'APPOINTMENT_LINK_FOLLOWUP', from: 'FOLLOWUP_NODE', to: 'APPOINTMENT_NODE', bow: 0.28, color: PALETTE.yellow },
  { id: 'CUSTOMER_LINK', from: 'APPOINTMENT_NODE', to: 'CUSTOMER_NODE', bow: 0.26, color: PALETTE.ivory },
];

export function findNode(id: NodeId): NexoraNodeConfig {
  const node = NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown NEXORA node id: ${id}`);
  return node;
}
