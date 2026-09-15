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
 * Notun emek payı: işaretli ve toplam yapılacak sayısı.
 *
 * Bilerek yalnızca *sayım*: bu modül DB'ye, React'e ve temaya dokunmuyor ki
 * `node stages.ts` ile doğrudan çalıştırılıp doğrulanabilsin (test çerçevesi
 * kurulu değil). Blok listesini buraya taşımak o imkânı yok ederdi.
 */
export interface LaborCount {
  done: number;
  total: number;
}

/** İşin ne kadarı bitti (0-1). Yapılacak yoksa null — emek ölçülemez. */
export function laborRatio(labor?: LaborCount): number | null {
  if (!labor || labor.total <= 0) return null;
  return Math.min(1, Math.max(0, labor.done / labor.total));
}

/**
 * Notun şu andaki görsel aşaması.
 *
 * `resolveStatus` üzerinden geçer; böylece kart, bir sonraki uygulama
 * açılışını beklemeden ot bağlamış görünür (DB ise time-skip'te yakalar).
 *
 * `labor` verilmezse davranış eskisiyle birebir aynı: yapılacak listesi
 * olmayan not yalnızca zamanla olgunlaşır.
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
 * Olgunluğa kalan yol: 0 = yeni ekildi, 1 = hasada hazır.
 *
 * Emek köprüsü burada: yapılacak listesi olan notta olgunluk yalnızca zamanın
 * değil *işin* de fonksiyonu — yarısı zaman, yarısı işaretlenen oran. Hepsi
 * işaretliyse not yaşına bakılmaksızın olgun sayılır; işi bitirmek ürünü
 * olgunlaştırır.
 *
 * Bunun bir bedeli var ve kasıtlı: yapılacakları olan bir not, süresi dolsa
 * bile işi yarım kaldıysa kendiliğinden hasada hazır olmuyor. Şikâyet zaten
 * "kullanıcı çalışsa bile bitki büyümüyor"du; tersi de doğru olmalı. Erken
 * hasat düğmesi her zaman açık.
 *
 * Hesap kalıcılaştırılmıyor — yeni sütun yok, time-skip'e yazma yok.
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
