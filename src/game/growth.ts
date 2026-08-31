/**
 * Büyüme/yabani ot kurallarının saf (yan etkisiz) hesabı.
 *
 * DB'den bilerek ayrıldı: kurallar burada, I/O `timeSkip.ts`'te. Böylece
 * mekanik, veritabanı veya React olmadan test edilebiliyor.
 */
import type { NoteStatus, SeedType } from '../types';
import {
  DEFAULT_GROWTH_RULES,
  growthDurationFor,
  type GrowthRules,
} from './config';

/** Simülasyon için gereken minimum not alanları. */
export interface SimulatableNote {
  id: number;
  status: NoteStatus;
  seed_type: SeedType;
  created_at: number;
  last_tended_at: number;
}

export interface SkipPlan {
  grownNoteIds: number[];
  weededNoteIds: number[];
}

/**
 * Bir notun verilen anda olması gereken statüsü.
 * Öncelik: yabani ot > büyüme. İkisi de sağlanıyorsa sonuç 'weedy'.
 */
export function resolveStatus(
  note: SimulatableNote,
  now: number,
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): NoteStatus {
  if (now - note.last_tended_at >= rules.weedThresholdMs) return 'weedy';

  // Simülasyon otu kendi başına temizlemez — bu kullanıcının jesti (tendNote).
  if (note.status === 'weedy') return 'weedy';

  // Büyüme tek yönlüdür: 'growing' bir not 'planted'a geri dönmez.
  if (note.status === 'growing') return 'growing';

  return now - note.created_at >= growthDurationFor(note.seed_type, rules)
    ? 'growing'
    : 'planted';
}

/** Hangi notun hangi statüye geçeceğine karar verir; hiçbir yan etkisi yoktur. */
export function computeSkipPlan(
  notes: SimulatableNote[],
  now: number,
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): SkipPlan {
  const grownNoteIds: number[] = [];
  const weededNoteIds: number[] = [];

  for (const note of notes) {
    const next = resolveStatus(note, now, rules);
    if (next === note.status) continue;
    if (next === 'weedy') weededNoteIds.push(note.id);
    else if (next === 'growing') grownNoteIds.push(note.id);
  }

  return { grownNoteIds, weededNoteIds };
}
