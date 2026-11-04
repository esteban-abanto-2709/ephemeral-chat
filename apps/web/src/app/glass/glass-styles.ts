export interface Themed {
  light: number;
  dark: number;
}

export interface LiquidStyle {
  kind: 'liquid';
  tint: Themed;
  blur: number;
  refraction: number;
  edge: number;
  light: number;
  border: Themed;
}

export interface FrostedStyle {
  kind: 'frosted';
  fill: Themed;
  blur: number;
  saturation: number;
  border: Themed;
}

export type GlassStyle = LiquidStyle | FrostedStyle;

const panel: LiquidStyle = {
  kind: 'liquid',
  tint: { light: 0.15, dark: 0.2 },
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
  card: { ...panel, tint: { light: 0.08, dark: 0.12 }, blur: 1 },
  bubble: {
    kind: 'frosted',
    fill: { light: 0.22, dark: 0.05 },
    blur: 6,
    saturation: 120,
    border: { light: 0.55, dark: 0.1 },
  },
  primary: {
    kind: 'frosted',
    fill: { light: 0.8, dark: 0.16 },
    blur: 6,
    saturation: 120,
    border: { light: 0.95, dark: 0.22 },
  },
} satisfies Record<string, GlassStyle>;

export type GlassName = keyof typeof glassStyles;
