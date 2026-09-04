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

/**
 * Yükseklik katmanları. Toprak paleti düşük kontrastlı olduğu için kartların
 * zeminden ayrılması kenarlığa bırakılamıyordu; gölge bu işi kenarlığı
 * kalınlaştırmadan yapıyor. Android'de gölge yalnızca zemini olan view'da
 * çizilir — `elevation` verilen her yüzeye `backgroundColor` de gerekir.
 */
export const elevation = {
  /** Izgaradaki parsel: toprağın üstünde durduğu anlaşılacak kadar. */
  card: {
    shadowColor: '#120c07',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  /** Ekranın üstüne çıkan yüzeyler: panel, ipucu balonu. */
  overlay: {
    shadowColor: '#120c07',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;

/**
 * Tipografi ölçeği. Her basamak kendi satır yüksekliğini taşır: sarmalanan
 * başlıklar (kart başlığı iki satıra kadar çıkıyor) satır aralığı verilmediğinde
 * platformdan platforma değişiyordu.
 *
 * `fontSize`'ı ezen bir stil `lineHeight`'ı da ezmeli — yoksa küçük metin
 * kendinden büyük bir satır kutusunda yüzer.
 */
export const typography = {
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: 0.5 },
  heading: { fontSize: 16, lineHeight: 21, fontWeight: '700', letterSpacing: 0.3 },
  body: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4 },
} as const;
