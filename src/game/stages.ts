/**
 * Görsel aşama (VisualStage) — UI'ın gördüğü durum.
 *
 * Neden ayrı bir kavram: veritabanındaki `status` üç değerle sınırlı
 * ('planted' | 'growing' | 'weedy') ve şemada CHECK kısıtıyla kilitli.
 * "Hasada hazır" ise zamanın bir fonksiyonu — her saniye değişebilir, onu
 * satıra yazmak time-skip'i her açılışta gereksiz yazma yapmaya zorlardı.
 * Bu yüzden 'harvestable' kalıcılaştırılmaz, notun yaşından türetilir.
 *
 * Sonuç: şema aynı kalır, UI canlı davranır.
 */
import type { NoteStatus, SeedType } from '../types';
import {
  DEFAULT_GROWTH_RULES,
  maturityDurationFor,
  SEED_CATALOG,
  type GrowthRules,
} from './config';
import { resolveStatus, type SimulatableNote } from './growth';

export type VisualStage = 'planted' | 'growing' | 'harvestable' | 'weedy';

/**
 * Notun şu andaki görsel aşaması.
 *
 * `resolveStatus` üzerinden geçer; böylece kart, bir sonraki uygulama
 * açılışını beklemeden ot bağlamış görünür (DB ise time-skip'te yakalar).
 */
export function resolveStage(
  note: SimulatableNote,
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): VisualStage {
  const status: NoteStatus = resolveStatus(note, now, rules);
  if (status === 'weedy') return 'weedy';

  if (now - note.created_at >= maturityDurationFor(note.seed_type, rules)) {
    return 'harvestable';
  }
  return status;
}

/** Olgunluğa kalan yol: 0 = yeni ekildi, 1 = hasada hazır. */
export function maturityProgress(
  note: SimulatableNote,
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): number {
  const total = maturityDurationFor(note.seed_type, rules);
  if (total <= 0) return 1;
  const ratio = (now - note.created_at) / total;
  return Math.min(1, Math.max(0, ratio));
}

/** Ot basmasına kalan süre (ms). Negatifse ot çoktan basmış. */
export function msUntilWeedy(
  note: SimulatableNote,
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): number {
  return note.last_tended_at + rules.weedThresholdMs - now;
}

/**
 * Aşamanın renk taşımayan görsel kimliği: simge, etiket, jest ipucu.
 * Renkler bilinçli olarak burada değil — bkz. src/theme/stageColors.ts.
 * Bu modül saf kalmalı (DB, React ve tema importu yok) ki `node stages.ts`
 * ile doğrudan çalıştırılıp doğrulanabilsin.
 */
export interface StageVisual {
  /** Aşamanın simgesi. 'harvestable' ürünün kendi simgesini kullanır. */
  emoji: string;
  label: string;
  /** Aşamanın kısa etkileşim ipucu. */
  hint: string;
}

export const STAGE_VISUALS: Record<VisualStage, StageVisual> = {
  planted: {
    emoji: '🌱',
    label: 'Ekildi',
    hint: 'Filizleniyor',
  },
  growing: {
    emoji: '🌿',
    label: 'Büyüyor',
    hint: 'Olgunlaşıyor',
  },
  harvestable: {
    emoji: '🌻',
    label: 'Hasada hazır',
    hint: 'Yukarı kaydır ↑',
  },
  weedy: {
    emoji: '🥀',
    label: 'Ot bastı',
    hint: 'Yana kaydır ↔',
  },
};

/** Aşamaya göre kartta gösterilecek simge (olgunsa ürünün kendisi). */
export function stageEmoji(stage: VisualStage, seed: SeedType): string {
  if (stage === 'harvestable') {
    return SEED_CATALOG[seed]?.emoji ?? STAGE_VISUALS.harvestable.emoji;
  }
  return STAGE_VISUALS[stage].emoji;
}
