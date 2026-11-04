export interface Themed {
  light: number;
  dark: number;
}

export interface LiquidStyle {
  kind: 'liquid';
  accent: boolean;
  tint: Themed;
  blur: number;
  refraction: number;
  edge: number;
  light: number;
  border: Themed;
}

export interface FrostedStyle {
  kind: 'frosted';
  accent: boolean;
  fill: Themed;
  blur: number;
  saturation: number;
  border: Themed;
}

export type GlassStyle = LiquidStyle | FrostedStyle;

const panel: LiquidStyle = {
  kind: 'liquid',
  accent: false,
  tint: { light: 0.25, dark: 0.3 },
  blur: 3,
  refraction: 1.6,
  edge: 28,
  light: 0.5,
  border: { light: 0.7, dark: 0.12 },
};

export const glassStyles = {
  panel,
  header: panel,
  composer: panel,
  send: { ...panel, accent: true, tint: { light: 0.35, dark: 0.35 } },
  bubbleMine: {
    kind: 'frosted',
    accent: true,
    fill: { light: 0.3, dark: 0.3 },
    blur: 16,
    saturation: 140,
    border: { light: 0.6, dark: 0.15 },
  },
  bubbleTheirs: {
    kind: 'frosted',
    accent: false,
    fill: { light: 0.5, dark: 0.09 },
    blur: 16,
    saturation: 140,
    border: { light: 0.7, dark: 0.12 },
  },
} satisfies Record<string, GlassStyle>;

export type GlassName = keyof typeof glassStyles;
