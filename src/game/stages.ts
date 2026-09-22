/**
 * Görsel aşama. UI'ın gördüğü durum.
 *
 * DB'deki `status` üç değerle sınırlı ('planted' | 'growing' | 'weedy') ve
 * şemada CHECK ile kilitli. "Hasada hazır" ise zamanla değişen bir şey, onu
 * satıra yazsak time-skip her açılışta boşuna yazma yapardı. O yüzden
 * 'harvestable' DB'ye yazılmıyor, notun yaşından hesaplanıyor.
 *
 * Böylece şema aynı kalıyor, UI canlı davranıyor.
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
 * Notun emek payı: işaretli ve toplam yapılacak sayısı.
 *
 * Sadece sayı tutuyoruz. Bu dosya DB'ye, React'e ve temaya dokunmasın ki
 * `node stages.ts` ile çalıştırıp deneyebileyim (test kurulu değil).
 * Blok listesini buraya taşırsam o imkan gidiyor.
 */
export interface LaborCount {
  done: number;
  total: number;
}

/** İşin ne kadarı bitti (0-1). Yapılacak yoksa null, ölçecek bir şey yok. */
export function laborRatio(labor?: LaborCount): number | null {
  if (!labor || labor.total <= 0) return null;
  return Math.min(1, Math.max(0, labor.done / labor.total));
}

/**
 * Notun şu anki görsel aşaması.
 *
 * resolveStatus'tan geçiyor, böylece kart bir sonraki açılışı beklemeden
 * otlanmış görünüyor. DB tarafını zaten time-skip yakalıyor.
 *
 * labor verilmezse davranış eskisiyle aynı: todo'su olmayan not sadece
 * zamanla olgunlaşıyor.
 */
export function resolveStage(
  note: SimulatableNote,
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
  labor?: LaborCount,
): VisualStage {
  const status: NoteStatus = resolveStatus(note, now, rules);
  if (status === 'weedy') return 'weedy';

  if (maturityProgress(note, now, rules, labor) >= 1) return 'harvestable';
  return status;
}

/**
 * Olgunluk oranı: 0 yeni ekildi, 1 hasada hazır.
 *
 * Emek kısmı burada. Todo'su olan notta olgunluk yarı zaman, yarı işaretlenen
 * oran. Hepsi işaretliyse yaşına bakmadan olgun sayıyoruz.
 *
 * Bunun bir bedeli var, bilerek: todo'su olan not süresi dolsa bile işi yarım
 * kaldıysa kendiliğinden hasada hazır olmuyor. Erken hasat düğmesi zaten hep
 * açık.
 *
 * Hesabı DB'ye yazmıyoruz: yeni sütun yok, time-skip'te yazma yok.
 */
export function maturityProgress(
  note: SimulatableNote,
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
  labor?: LaborCount,
): number {
  const total = maturityDurationFor(note.seed_type, rules);
  const elapsed = total <= 0 ? 1 : (now - note.created_at) / total;
  const byTime = Math.min(1, Math.max(0, elapsed));

  const byWork = laborRatio(labor);
  if (byWork === null) return byTime;
  if (byWork >= 1) return 1;

  return 0.5 * byTime + 0.5 * byWork;
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
 * Aşamanın simgesi, etiketi ve jest ipucu. Renkler burada değil,
 * src/theme/stageColors.ts'te duruyor. Bu dosyanın DB, React ve tema importu
 * olmamalı ki `node stages.ts` ile çalıştırabileyim.
 */
export interface StageVisual {
  /** Aşamanın simgesi. 'harvestable' ürünün kendi simgesini kullanır. */
  emoji: string;
  label: string;
  /** Ne yapılacağını söyleyen kısa ipucu. */
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
