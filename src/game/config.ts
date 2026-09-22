/**
 * Oyunun bütün ayarları burada. Eşikleri değiştirince time-skip davranışı
 * komple değişiyor. Denerken üzerine yazabilmek için fonksiyonlara opsiyonel
 * `rules` olarak geçiyoruz.
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
   * Time-skip'in çalışması için gereken en az boşluk. Arka plandan geri
   * dönme gibi saniyelik durumlarda boşuna yazma yapmasın diye.
   */
  minSkipMs: number;
}

export const DEFAULT_GROWTH_RULES: GrowthRules = {
  growthDurationMs: 8 * HOUR,
  weedThresholdMs: 48 * HOUR,
  minSkipMs: 5 * MINUTE,
};

/**
 * Ot basmasına ne kadar kala hatırlatma atacağız.
 *
 * 48 saatlik eşiğe 6 saat kala. Aynı gün içinde tepki verilebilecek kadar
 * erken, "daha çok var" dedirtmeyecek kadar geç.
 */
export const WEED_REMINDER_LEAD_MS = 6 * HOUR;

/** Tohum başına bilgiler. Büyüme süresi türe göre değişiyor. */
export interface SeedDefinition {
  type: SeedType;
  /** Şimdilik Türkçe, i18n sonra. */
  label: string;
  /** Kart üstünde ve tohum seçicide görünen ürün simgesi. */
  emoji: string;
  /** Seçicide görünen kısa ipucu. */
  hint: string;
  /** Bu tür için 'planted' -> 'growing' süresi. */
  growthDurationMs: number;
  /**
   * Ürünün hasada hazır olma süresi. Bu sadece görsel bir aşama, DB'deki
   * status sütunu değişmiyor (bkz. src/game/stages.ts).
   */
  maturityDurationMs: number;
  /** Kilerdeki puanı. İleride skor/rozet yaparsak lazım olacak. */
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
