/**
 * Tasarım token'ları.
 *
 * v2 yönü: **kağıt önde, toprak katman**. Uygulama kabuğu (ekran zeminleri,
 * başlıklar, paneller, sekme çubuğu) aydınlık ve tipografi odaklı; toprak
 * paleti silinmedi ama rolü değişti — artık zemin değil, *mürekkep* ve *oyun
 * yüzeyi*. Parseller hâlâ koyu toprak kartlar; farkları da bu sayede okunuyor:
 * kağıdın üstünde duran birkaç kare toprak.
 *
 * Ekstra kütüphane yok; hiyerarşi renkten çok tipografi ve boşlukla kuruluyor.
 */
import { Platform, StyleSheet } from 'react-native';

export const colors = {
  /* ---------------------------------------------------------------- */
  /* Kağıt — uygulama kabuğu                                          */
  /* ---------------------------------------------------------------- */
  /** Ekran zemini. Nötr gri değil: toprağa doğru hafif kırık. */
  ground: '#faf8f5',
  /** Kart, panel, başlık şeridi. */
  surface: '#ffffff',
  /** Girinti hissi veren yüzey: metin kutusu, sekme zemini, banner. */
  surfaceSunken: '#f2eee8',
  /** Ayraç çizgisi — kalın kenarlığın yerini alır. */
  rule: '#e6dfd4',
  /** Vurgulu ayraç / pasif kenarlık. */
  ruleStrong: '#d5cabb',

  /* ---------------------------------------------------------------- */
  /* Toprak — oyun yüzeyi ve mürekkep                                 */
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
   * Aydınlık zeminde okunabilen yeşil. `leaf` kağıt üzerinde ~2.2 kontrasta
   * düşüyor; aksan rengi olarak kullanılacak her yerde bu kullanılmalı.
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
  /** Kağıt üzerinde gövde ve başlık. Toprağın en koyu tonu = mürekkep. */
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
 * Köşeler. Piksel hissi bırakıldı: kabuk yumuşadı, ama parseller hâlâ
 * `md` kullanıyor — toprak kart kağıt panelden biraz daha keskin kalsın.
 */
export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const borders = {
  /**
   * Ayraçlar için: cihazın çizebildiği en ince çizgi. Kağıt düzende
   * hiyerarşiyi kenarlık değil boşluk kuruyor — çizgi yalnızca ayırıyor.
   */
  hairline: StyleSheet.hairlineWidth,
  width: 1,
  /** Yalnızca oyun yüzeylerinde (parsel, kiler kartı) kalın kenarlık kalır. */
  thick: 2,
} as const;

/**
 * Yükseklik katmanları. Aydınlık zeminde gölge koyu paletteki kadar
 * çalışmıyor; opaklık düştü, yarıçap arttı — gölge artık "ayırıcı" değil,
 * yalnızca yüzeyin kağıttan bir tık yukarıda olduğunu söylüyor.
 *
 * Android'de gölge yalnızca zemini olan view'da çizilir — `elevation`
 * verilen her yüzeye `backgroundColor` de gerekir.
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
 * Tipografi ölçeği. Her basamak kendi satır yüksekliğini taşır: sarmalanan
 * başlıklar satır aralığı verilmediğinde platformdan platforma değişiyordu.
 *
 * `fontSize`'ı ezen bir stil `lineHeight`'ı da ezmeli — yoksa küçük metin
 * kendinden büyük bir satır kutusunda yüzer.
 *
 * v2'de ölçek iki uçtan da açıldı: `display` ekran başlıkları için,
 * `bodyLarge` okunacak metin için (blok editörü bunu kullanacak). Başlıkların
 * harf aralığı negatife çekildi — büyük puntoda sıkışık başlık daha sakin
 * duruyor; `caption` ise pozitif kaldı, küçük puntoda nefes gerekiyor.
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 16, lineHeight: 21, fontWeight: '700', letterSpacing: -0.1 },
  /** Okunacak metin: ferah satır aralığı. Blok editörünün paragrafı budur. */
  bodyLarge: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
  /**
   * Not *içindeki* başlık. `title` ekran başlığı için 22 punto; panelin kendi
   * başlığıyla aynı boyda bir blok başlığı hiyerarşiyi düzleştiriyordu.
   */
  blockHeading: { fontSize: 19, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4 },
  /** Büyük harfli alan etiketi. */
  label: { fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 0.9 },
} as const;

/**
 * Yazı tipi aileleri. Tek aralıklı yüzü olan tek yer kod bloğu; adı platforma
 * göre değişiyor ve her kullanımda `Platform.select` yazmak istemiyoruz.
 */
export const fonts = {
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

/**
 * Sabit geometrili yüzeylerde sistem yazı tipi büyütmesinin üst sınırı.
 *
 * Parsel kartının yüksekliği ızgaradan geliyor ve başlığı `numberOfLines={2}`
 * ile sınırlı; sistem yazısı %200'e çıktığında metin kutuya sığmayıp
 * kırpılıyor. Okunacak yüzeylerde (not detayı, kiler kartı) sınır YOK —
 * erişilebilirlik ayarı oralarda sonuna kadar çalışmalı.
 */
export const DENSE_FONT_SCALE_CAP = 1.3;
