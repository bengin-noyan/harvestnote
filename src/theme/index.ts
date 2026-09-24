/**
 * Tasarım değerleri.
 *
 * Açık ve koyu iki palet var, ikisinin anahtarları aynı. Bileşenler rengi
 * ThemeProvider'daki useTheme() ya da makeStyles() ile alıyor. Burada sabit
 * bir colors export'u bilerek yok, olsaydı tema değişince o yerler eski
 * renkte kalırdı.
 *
 * Toprak renkleri bitki ve kart kapakları için duruyor. Boşluk, köşe ve yazı
 * boyutları temaya göre değişmiyor.
 */
import { Platform, StyleSheet } from 'react-native';

import type { VisualStage } from '../game/stages';

export type Scheme = 'light' | 'dark';

export interface ThemeColors {
  /* Kabuk */
  ground: string;
  surface: string;
  sidebar: string;
  surfaceSunken: string;
  hover: string;
  selected: string;
  rule: string;
  ruleStrong: string;
  // menü ve kart zemini, koyu temada sayfadan biraz açık
  popover: string;
  card: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  dangerSoft: string;
  backdrop: string;
  toast: string;
  onToast: string;

  /* Oyun yüzeyi */
  bark: string;
  soilDeep: string;
  soil: string;
  soilLight: string;
  furrow: string;
  grass: string;
  leaf: string;
  leafLight: string;
  leafDeep: string;
  gold: string;
  goldLight: string;
  goldDeep: string;
  weed: string;
  weedDeep: string;
  withered: string;
  parchment: string;
  parchmentDark: string;
  textOnDark: string;
  textOnDarkMuted: string;
}

const game = {
  bark: '#241a12',
  soilDeep: '#2f2118',
  soil: '#4a3527',
  soilLight: '#6b4c37',
  furrow: '#3a2a1e',
  grass: '#3f6b32',
  leaf: '#6aa84f',
  leafLight: '#9ccc65',
  gold: '#e0a828',
  goldLight: '#ffd76e',
  goldDeep: '#a8761a',
  weed: '#42552f',
  weedDeep: '#1c2416',
  withered: '#8a7a5f',
  parchment: '#f7efe0',
  parchmentDark: '#e6d7bd',
  textOnDark: '#f3e5c8',
  textOnDarkMuted: '#bda887',
};

// Renkleri Notion'a yakın tuttum.
const lightColors: ThemeColors = {
  ground: '#ffffff',
  surface: '#ffffff',
  sidebar: '#f8f8f7',
  surfaceSunken: '#f7f6f3',
  hover: '#efefed',
  selected: '#ebebea',
  rule: '#e9e9e7',
  ruleStrong: '#d3d1cb',
  popover: '#ffffff',
  card: '#ffffff',
  accent: '#2383e2',
  accentPressed: '#0077d4',
  accentSoft: '#e7f3f8',
  onAccent: '#ffffff',
  textPrimary: '#37352f',
  textSecondary: '#5f5e5b',
  textMuted: '#9b9a97',
  danger: '#d44c47',
  dangerSoft: '#fdebec',
  backdrop: '#0f0f0f',
  toast: '#2f2f2f',
  onToast: '#ffffff',
  ...game,
  // Açık zeminde okunan yeşil. leaf kağıt üstünde 2.2 kontrasta düşüyor.
  leafDeep: '#4f7d3a',
};

const darkColors: ThemeColors = {
  ground: '#191919',
  surface: '#191919',
  sidebar: '#202020',
  surfaceSunken: '#252525',
  hover: '#2a2a2a',
  selected: '#2c2c2c',
  rule: '#2f2f2f',
  ruleStrong: '#434343',
  popover: '#252525',
  card: '#202020',
  accent: '#2383e2',
  accentPressed: '#3a92e6',
  accentSoft: '#1c3246',
  onAccent: '#ffffff',
  textPrimary: '#d4d4d4',
  textSecondary: '#a3a3a3',
  textMuted: '#7f7f7f',
  danger: '#e0645c',
  dangerSoft: '#3a2322',
  backdrop: '#000000',
  toast: '#373737',
  onToast: '#f0f0f0',
  ...game,
  // Koyu zeminde koyu yeşil kayboluyor, bir ton açığını kullanıyoruz.
  leafDeep: '#6aa84f',
};

// Etiket renkleri. Aşama ve kalite etiketleri bunları kullanıyor.
export type TagColor =
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'red';

export type TagPalette = Record<TagColor, { bg: string; text: string }>;

const lightTags: TagPalette = {
  gray: { bg: '#e3e2e0', text: '#32302c' },
  brown: { bg: '#eee0da', text: '#442a1e' },
  orange: { bg: '#fadec9', text: '#49290e' },
  yellow: { bg: '#fdecc8', text: '#402c1b' },
  green: { bg: '#dbeddb', text: '#1c3829' },
  blue: { bg: '#d3e5ef', text: '#183347' },
  red: { bg: '#ffe2dd', text: '#5d1715' },
};

const darkTags: TagPalette = {
  gray: { bg: '#3c3c3c', text: '#e0e0e0' },
  brown: { bg: '#603b2c', text: '#f0e2dc' },
  orange: { bg: '#854c1d', text: '#fbe6d4' },
  yellow: { bg: '#89632a', text: '#fcefd6' },
  green: { bg: '#2b593f', text: '#dcefe3' },
  blue: { bg: '#28456c', text: '#dbe8f6' },
  red: { bg: '#6e3630', text: '#fbe1dd' },
};

// Aşama renkleri. accent nokta ve çubuklar için, tag etiket için.
export interface StagePalette {
  accent: string;
  tag: TagColor;
  // kart kapağının zemini
  cover: string;
}

type StagePalettes = Record<VisualStage, StagePalette>;

const lightStages: StagePalettes = {
  planted: { accent: '#9f6b53', tag: 'brown', cover: '#f6efe9' },
  growing: { accent: '#448361', tag: 'green', cover: '#edf5ee' },
  harvestable: { accent: '#cb912f', tag: 'yellow', cover: '#fcf3df' },
  weedy: { accent: '#d44c47', tag: 'red', cover: '#fbeceb' },
};

const darkStages: StagePalettes = {
  planted: { accent: '#ba856f', tag: 'brown', cover: '#2a2320' },
  growing: { accent: '#529e72', tag: 'green', cover: '#1f2a23' },
  harvestable: { accent: '#ca9849', tag: 'yellow', cover: '#2e2719' },
  weedy: { accent: '#df5452', tag: 'red', cover: '#2e1f1e' },
};

// Gölgeler. Android'de gölge sadece arka plan rengi olan view'da çıkıyor.
// Koyu temada gölge zor görünüyor, orada opaklığı artırdım.
function elevationFor(scheme: Scheme) {
  const dark = scheme === 'dark';
  return {
    card: {
      shadowColor: '#000000',
      shadowOpacity: dark ? 0.3 : 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    overlay: {
      shadowColor: '#000000',
      shadowOpacity: dark ? 0.5 : 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -6 },
      elevation: 14,
    },
    popover: {
      shadowColor: '#000000',
      shadowOpacity: dark ? 0.45 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
  } as const;
}

export interface Theme {
  scheme: Scheme;
  colors: ThemeColors;
  tags: TagPalette;
  stages: StagePalettes;
  elevation: ReturnType<typeof elevationFor>;
}

export const themes: Record<Scheme, Theme> = {
  light: {
    scheme: 'light',
    colors: lightColors,
    tags: lightTags,
    stages: lightStages,
    elevation: elevationFor('light'),
  },
  dark: {
    scheme: 'dark',
    colors: darkColors,
    tags: darkTags,
    stages: darkStages,
    elevation: elevationFor('dark'),
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  // satır, düğme ve etiketler için
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const borders = {
  // cihazın çizebildiği en ince çizgi
  hairline: StyleSheet.hairlineWidth,
  width: 1,
  thick: 2,
} as const;

// Yazı boyutları. Her birinin kendi lineHeight'ı var, yoksa iki satıra düşen
// başlıklar platforma göre farklı görünüyordu. fontSize'ı değiştirirsen
// lineHeight'ı da değiştir, yoksa yazı kutunun içinde kayıyor.
export const typography = {
  // sayfa başlığı
  pageTitle: { fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -0.4 },
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  // sayfa içi bölüm başlıkları
  section: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.1 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  // not metni
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  // not içindeki başlık bloğu
  blockHeading: { fontSize: 24, lineHeight: 31, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  // kenar çubuğu ve menüler, body'nin biraz kalını
  ui: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  // "Çalışma alanı" gibi küçük başlıklar
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

/**
 * Font aileleri. Monospace'i sadece kod bloğu kullanıyor ama adı platforma
 * göre değiştiği için her seferinde Platform.select yazmayalım.
 */
export const fonts = {
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// Kartlar gibi boyu sabit yerlerde sistem yazı büyütmesine sınır. %200'de
// yazı karta sığmayıp kesiliyordu. Not sayfası gibi yerlerde sınır yok.
export const DENSE_FONT_SCALE_CAP = 1.3;

