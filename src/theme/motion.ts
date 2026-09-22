/**
 * Animasyon değerleri tek yerde dursun.
 *
 * Süreleri bileşenlerin içine dağıtınca her ekran farklı hızda oluyordu,
 * hepsini buraya topladım.
 *
 * Dikkat: bunlar worklet içinden de okunuyor, o yüzden hepsi düz obje ya da
 * Reanimated'in kendi easing'i.
 */
import { Easing } from 'react-native-reanimated';

/** Süreler (ms). Aralarında 1.5x fark var, gözle ayırt ediliyor. */
export const durations = {
  /** Basış, sallanma gibi anlık şeyler. */
  fast: 140,
  /** Varsayılan. Giriş/çıkış, katman değişimi. */
  base: 220,
  /** Panel açılması, hasat gibi büyük hareketler. */
  slow: 300,
} as const;

export const easings = {
  /** Giren şeyler için. Hızlı başlıyor, yumuşak duruyor. */
  out: Easing.bezier(0.22, 1, 0.36, 1),
  /** Çıkanlar için, oyalanmasın. */
  in: Easing.bezier(0.4, 0, 1, 1),
} as const;

/**
 * Yaylar. `enter` hafif zıplıyor, `settle` zıplamıyor. Parmağın bıraktığı
 * yerden geri dönen bir şey salınınca bug gibi duruyor.
 */
export const springs = {
  enter: { damping: 14, stiffness: 170 },
  settle: { damping: 17, stiffness: 180 },
} as const;
