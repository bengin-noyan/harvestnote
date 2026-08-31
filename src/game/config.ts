/**
 * Oyun ekonomisinin tek ayar noktası. Eşikleri buradan değiştirmek
 * time-skip davranışını komple değiştirir; testlerde de bu sabitler
 * override edilebilsin diye fonksiyonlara opsiyonel `rules` olarak geçilir.
 */
import type { SeedType } from '../types';

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export interface GrowthRules {
  /** 'planted' -> 'growing' için gereken süre (ekimden itibaren). */
  growthDurationMs: number;
  /** Son bakımdan itibaren bu süre geçerse not 'weedy' olur. */
  weedThresholdMs: number;
  /**
   * Time-skip'in çalışması için gereken minimum boşluk. Uygulamayı arka
   * plandan öne alma gibi saniyelik dönüşlerde boşuna yazma yapmamak için.
   */
  minSkipMs: number;
}

export const DEFAULT_GROWTH_RULES: GrowthRules = {
  growthDurationMs: 8 * HOUR,
  weedThresholdMs: 48 * HOUR,
  minSkipMs: 5 * MINUTE,
};

/**
 * Ot basmasına ne kadar kala hatırlatma gönderileceği.
 *
 * 48 saatlik eşiğe 6 saat kala: kullanıcının aynı gün içinde tepki verebileceği
 * kadar erken, "daha çok var" diye görmezden gelemeyeceği kadar geç.
 */
export const WEED_REMINDER_LEAD_MS = 6 * HOUR;

/** Tohum başına metadata. Büyüme süresi türe göre farklılaşır. */
export interface SeedDefinition {
  type: SeedType;
  /** i18n gelene kadar TR etiket. */
  label: string;
  /** Kart üstünde ve tohum seçicide görünen ürün simgesi. */
  emoji: string;
  /** Tohum seçicide görevin niteliğini anlatan kısa ipucu. */
  hint: string;
  /** Bu tür için 'planted' -> 'growing' süresi. */
  growthDurationMs: number;
  /**
   * Ürünün hasada hazır ('harvestable') hale gelme süresi. Bu yalnızca
   * görsel/etkileşimsel bir aşamadır — DB'deki `status` sütunu değişmez,
   * bkz. src/game/stages.ts.
   */
  maturityDurationMs: number;
  /** Kilerdeki değeri — ileride skor/rozet mekaniği için. */
  value: number;
}

export const SEED_CATALOG: Record<SeedType, SeedDefinition> = {
  wheat: {
    type: 'wheat',
    label: 'Buğday',
    emoji: '🌾',
    hint: 'Gündelik, hızlı iş',
    growthDurationMs: 4 * HOUR,
    maturityDurationMs: 8 * HOUR,
    value: 1,
  },
  carrot: {
    type: 'carrot',
    label: 'Havuç',
    emoji: '🥕',
    hint: 'Kısa not',
    growthDurationMs: 6 * HOUR,
    maturityDurationMs: 12 * HOUR,
    value: 2,
  },
  tomato: {
    type: 'tomato',
    label: 'Domates',
    emoji: '🍅',
    hint: 'Orta vadeli görev',
    growthDurationMs: 12 * HOUR,
    maturityDurationMs: DAY,
    value: 3,
  },
  pumpkin: {
    type: 'pumpkin',
    label: 'Balkabağı',
    emoji: '🎃',
    hint: 'Uzun soluklu proje',
    growthDurationMs: 2 * DAY,
    maturityDurationMs: 4 * DAY,
    value: 5,
  },
  sunflower: {
    type: 'sunflower',
    label: 'Ayçiçeği',
    emoji: '🌻',
    hint: 'Fikir, serbest not',
    growthDurationMs: 8 * HOUR,
    maturityDurationMs: 16 * HOUR,
    value: 2,
  },
};

/** Tohum seçicinin gösterdiği sıra (hızlıdan yavaşa). */
export const SEED_ORDER: SeedType[] = [
  'wheat',
  'carrot',
  'sunflower',
  'tomato',
  'pumpkin',
];

export const DEFAULT_SEED_TYPE: SeedType = 'wheat';

/** Türe özel süre yoksa genel kurala düş. */
export function growthDurationFor(
  seed: SeedType,
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): number {
  return SEED_CATALOG[seed]?.growthDurationMs ?? rules.growthDurationMs;
}

/** Ürünün hasada hazır hale gelmesi için gereken süre. */
export function maturityDurationFor(
  seed: SeedType,
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): number {
  return SEED_CATALOG[seed]?.maturityDurationMs ?? rules.growthDurationMs * 2;
}
