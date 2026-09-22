/**
 * Büyüme ve ot kuralları. Burada sadece hesap var, yazma yok.
 * DB işleri timeSkip.ts'te; böylece bu dosyayı tek başına çalıştırıp
 * kuralları deneyebiliyorum.
 */
import type { NoteStatus, SeedType } from '../types';
import {
  DEFAULT_GROWTH_RULES,
  growthDurationFor,
  type GrowthRules,
} from './config';

/** Simülasyonun ihtiyacı olan alanlar, notun tamamı gerekmiyor. */
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
 * Notun o an hangi statüde olması gerektiği.
 * Ot büyümeyi eziyor, ikisi de olduysa sonuç 'weedy'.
 */
export function resolveStatus(
  note: SimulatableNote,
  now: number,
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
): NoteStatus {
  if (now - note.last_tended_at >= rules.weedThresholdMs) return 'weedy';

  // Otu simülasyon temizlemiyor, onu kullanıcı yapıyor (tendNote).
  if (note.status === 'weedy') return 'weedy';

  // Büyüme geri sarmıyor, growing olan not tekrar planted olmuyor.
  if (note.status === 'growing') return 'growing';

  return now - note.created_at >= growthDurationFor(note.seed_type, rules)
    ? 'growing'
    : 'planted';
}

/** Kimin statüsü değişecek onu çıkarır. Yazma işi çağırana kalıyor. */
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
