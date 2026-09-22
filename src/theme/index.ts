/**
 * Tasarım değerleri.
 *
 * v2 yönü: kağıt önde, toprak arkada. Kabuk (ekran zeminleri, başlıklar,
 * paneller) açık renk ve tipografi ağırlıklı. Toprak paletini silmedim ama
 * artık zemin değil, yazı rengi ve oyun yüzeyi olarak duruyor. Parseller hâlâ
 * koyu toprak kartlar, kağıdın üstünde daha iyi ayrışıyorlar.
 *
 * Ekstra kütüphane yok, hiyerarşiyi renkten çok tipografi ve boşluk kuruyor.
 */
import { Platform, StyleSheet } from 'react-native';

export const colors = {
  /* ---------------------------------------------------------------- */
  /* Kağıt - uygulama kabuğu                                          */
  /* ---------------------------------------------------------------- */
  /** Ekran zemini. Düz gri değil, toprağa doğru hafif kırık. */
  ground: '#faf8f5',
  /** Kart, panel, başlık şeridi. */
  surface: '#ffffff',
  /** Girinti hissi veren yüzey: metin kutusu, sekme zemini, banner. */
  surfaceSunken: '#f2eee8',
  /** Ayraç çizgisi. Kalın kenarlığın yerine geçti. */
  rule: '#e6dfd4',
  /** Vurgulu ayraç / pasif kenarlık. */
  ruleStrong: '#d5cabb',

  /* ---------------------------------------------------------------- */
  /* Toprak - oyun yüzeyi ve mürekkep                                 */
  /* ---------------------------------------------------------------- */
  bark: '#241a12',
  soilDeep: '#2f2118',
  soil: '#4a3527',
  soilLight: '#6b4c37',
  furrow: '#3a2a1e',

  /* Bitki */
  grass: '#3f6b32',
  leaf: '#6aa84f',
  leafLight: '#9ccc65',
  /**
   * Açık zeminde okunan yeşil. `leaf` kağıt üstünde 2.2 kontrasta düşüyor,
   * aksan rengi gereken her yerde bunu kullanın.
   */
  leafDeep: '#4f7d3a',

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

  /* ---------------------------------------------------------------- */
  /* Metin                                                            */
  /* ---------------------------------------------------------------- */
  /** Kağıt üstünde gövde ve başlık. Toprağın en koyu tonu yazı rengi oldu. */
  textPrimary: '#241a12',
  /** İkincil metin: alt başlık, açıklama. */
  textSecondary: '#4d3b2c',
  /** Üçüncül: etiket, ipucu, zaman damgası. */
  textMuted: '#7a6650',
  /** Toprak yüzeyler üzerinde (parsel, ipucu balonu). */
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

/**
 * Köşe yuvarlamaları. Kabuk yumuşadı ama parseller hâlâ `md` kullanıyor,
 * toprak kart panelden biraz daha keskin kalsın istedim.
 */
export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const borders = {
  /**
   * Ayraçlar için, cihazın çizebildiği en ince çizgi. Bu düzende hiyerarşiyi
   * kenarlık değil boşluk kuruyor, çizgi sadece ayırıyor.
   */
  hairline: StyleSheet.hairlineWidth,
  width: 1,
  /** Kalın kenarlık sadece oyun yüzeylerinde kaldı (parsel, kiler kartı). */
  thick: 2,
} as const;

/**
 * Gölge katmanları. Açık zeminde gölge koyu paletteki kadar çalışmıyor,
 * opaklığı düşürüp yarıçapı artırdım. Artık ayırıcı değil, sadece yüzeyin
 * kağıttan bir tık yukarıda olduğunu gösteriyor.
 *
 * Android'de gölge sadece zemini olan view'da çiziliyor, `elevation` verdiğin
 * her yüzeye `backgroundColor` da lazım.
 */
export const elevation = {
  /** Izgaradaki parsel, kiler kartı. */
  card: {
    shadowColor: '#3a2a1e',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  /** Ekranın üstüne çıkan yüzeyler: panel, ipucu balonu. */
  overlay: {
    shadowColor: '#241a12',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
} as const;

/**
 * Tipografi ölçeği. Her basamak kendi lineHeight'ını taşıyor, yoksa iki satıra
 * düşen başlıklar platformdan platforma değişiyordu.
 *
 * fontSize'ı ezen bir stil lineHeight'ı da ezmeli, yoksa küçük metin kendinden
 * büyük bir satır kutusunda yüzüyor.
 *
 * v2'de ölçeği iki uçtan açtım: `display` ekran başlıkları, `bodyLarge`
 * okunacak metin için (blok editörü onu kullanıyor). Başlıklarda harf aralığı
 * negatif, büyük puntoda daha sakin duruyor. `caption` pozitif kaldı, küçük
 * puntoda nefes gerekiyor.
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 16, lineHeight: 21, fontWeight: '700', letterSpacing: -0.1 },
  /** Okunacak metin, satır aralığı ferah. Blok editörünün paragrafı bu. */
  bodyLarge: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
  /**
   * Notun içindeki başlık. `title` ekran başlığı için 22 punto ve panelin
   * başlığıyla aynı boyda blok başlığı koyunca hiyerarşi düzleşiyordu.
   */
  blockHeading: { fontSize: 19, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4 },
  /** Büyük harfli alan etiketi. */
  label: { fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 0.9 },
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

/**
 * Boyu sabit olan yüzeylerde sistem yazı büyütmesinin üst sınırı.
 *
 * Parselin yüksekliği ızgaradan geliyor, başlığı da numberOfLines={2} ile
 * sınırlı. Sistem yazısı %200'e çıkınca metin kutuya sığmayıp kırpılıyor.
 * Okunan yüzeylerde (not detayı, kiler kartı) sınır koymuyoruz,
 * erişilebilirlik ayarı orada sonuna kadar çalışsın.
 */
export const DENSE_FONT_SCALE_CAP = 1.3;
