// NEXORA brand palette — single source of truth for the 3D hero + any 2D UI built around it.
export const PALETTE = {
  deepTeal: '#081A1C',
  darkSurface: '#102629',
  coral: '#FF6B4A',
  mint: '#62D8C4',
  yellow: '#F4C95D',
  ivory: '#F5F1E8',
  muted: '#9EB5B3',
} as const;

export type PaletteKey = keyof typeof PALETTE;
