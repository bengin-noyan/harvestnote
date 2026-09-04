/**
 * Hareket dili.
 *
 * Uygulamadaki her geçiş — kart filizlenmesi, panel açılışı, ipucu balonu —
 * aynı iki eğriden ve aynı süre ölçeğinden beslenir. Değerler bileşenlerin
 * içine dağıldığında her ekran kendi ritmini uyduruyordu; burada tek yerde
 * durunca uygulama tek elden çıkmış gibi hissettiriyor.
 *
 * Tokenlar worklet'lerin içinden de okunuyor, o yüzden hepsi düz veri ya da
 * Reanimated'in kendi easing nesneleri.
 */
import { Easing } from 'react-native-reanimated';

/** Süre ölçeği (ms). Aradaki oran 1.5x — basamaklar birbirinden ayırt edilir. */
export const durations = {
  /** Anlık geri bildirim: basış, sallanma adımı. */
  fast: 140,
  /** Varsayılan: katman değişimi, giriş/çıkış. */
  base: 220,
  /** Yer değiştiren büyük yüzeyler: panel, hasat. */
  slow: 300,
} as const;

export const easings = {
  /** Giren ve yerleşen her şey: hızlı başlar, yumuşak durur. */
  out: Easing.bezier(0.22, 1, 0.36, 1),
  /** Çıkan / kaybolan: ekranı oyalamadan terk eder. */
  in: Easing.bezier(0.4, 0, 1, 1),
} as const;

/**
 * Yaylar. `enter` biraz zıplar (canlılık), `settle` zıplamaz — parmağın
 * bıraktığı yerden geri dönen bir şey salınırsa hatalı gibi görünüyor.
 */
export const springs = {
  enter: { damping: 14, stiffness: 170 },
  settle: { damping: 17, stiffness: 180 },
} as const;
