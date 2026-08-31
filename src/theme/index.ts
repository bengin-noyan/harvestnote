/**
 * Toprak paleti. Ekstra kütüphane yok; pixel-art hissi keskin köşeler,
 * kalın kenarlıklar ve sınırlı sayıda doygun renkle kuruluyor.
 */

export const colors = {
  /* Toprak */
  bark: '#241a12',
  soilDeep: '#2f2118',
  soil: '#4a3527',
  soilLight: '#6b4c37',
  furrow: '#3a2a1e',

  /* Bitki */
  grass: '#3f6b32',
  leaf: '#6aa84f',
  leafLight: '#9ccc65',

  /* Olgun / hasat */
  gold: '#e0a828',
  goldLight: '#ffd76e',
  goldDeep: '#a8761a',

  /* Yabani ot */
  weed: '#42552f',
  weedDeep: '#1c2416',

  /* Kiler */
  withered: '#8a7a5f',
  parchment: '#f7efe0',
  parchmentDark: '#e6d7bd',

  /* Metin */
  textPrimary: '#2f2118',
  textMuted: '#7a6650',
  textOnDark: '#f3e5c8',
  textOnDarkMuted: '#bda887',

  danger: '#b4472f',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Pixel-art hissi için köşeler bilinçli olarak küçük tutuldu. */
export const radii = {
  sm: 4,
  md: 6,
  lg: 10,
  pill: 999,
} as const;

export const borders = {
  width: 2,
  thick: 3,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  heading: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  body: { fontSize: 14, fontWeight: '500' },
  caption: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
} as const;
