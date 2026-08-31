/**
 * Zaman Atlaması (Time Skip)
 *
 * Arka planda çalışan bir servis YOK. Uygulama her açıldığında
 * `settings.last_opened_at` ile şimdi arasındaki fark ölçülür ve tarlada
 * "o sürede olması gerekenler" tek seferde uygulanır. Pil tüketimi sıfır,
 * sonuç aynı.
 *
 * Kurallar:
 *  - Bir not son bakımından (`last_tended_at`) itibaren `weedThresholdMs`
 *    kadar dokunulmadan kaldıysa 'weedy' olur.
 *  - 'planted' bir not, türüne göre belirlenen büyüme süresini doldurduysa
 *    'growing' olur.
 *  - Yabani ot büyümeyi ezer: iki koşul da sağlanıyorsa sonuç 'weedy'.
 *  - Hasat edilmiş notlara (harvested_at != NULL) dokunulmaz.
 */
import { getDatabase } from '../db/database';
import { toNoteStatus, toSeedType } from '../db/mappers';
import {
  ensureSettings,
  setLastOpenedAt,
} from '../db/repositories/settings';
import { setNoteStatuses } from '../db/repositories/notes';
import type { TimeSkipResult } from '../types';
import { DAY, DEFAULT_GROWTH_RULES, type GrowthRules } from './config';
import { computeSkipPlan, type SimulatableNote } from './growth';

// Kuralların saf hesabı growth.ts'te; burası yalnızca I/O ve zamanlama.
export { computeSkipPlan, resolveStatus } from './growth';
export type { SimulatableNote, SkipPlan } from './growth';

export interface RunTimeSkipOptions {
  /** Test/simülasyon için "şimdi"yi enjekte et. */
  now?: number;
  rules?: GrowthRules;
  /**
   * Eşik kontrolünü atlayıp simülasyonu zorla çalıştır (geliştirici menüsü,
   * "1 gün ileri sar" gibi hata ayıklama araçları için).
   */
  force?: boolean;
}

/**
 * Açılışta bir kez çağrılır. Geçen süreyi ölçer, tarlayı günceller ve
 * `last_opened_at`'i tazeler. Dönen özet UI'da "3 gün yoktun, 2 notunu ot
 * bastı" tarzı bir karşılama ekranı için yeterlidir.
 */
export async function runTimeSkip(
  options: RunTimeSkipOptions = {},
): Promise<TimeSkipResult> {
  const now = options.now ?? Date.now();
  const rules = options.rules ?? DEFAULT_GROWTH_RULES;

  const { settings, created } = await ensureSettings(now);
  const elapsedMs = now - settings.last_opened_at;

  const base: TimeSkipResult = {
    didRun: false,
    elapsedMs,
    elapsedDays: Math.max(0, Math.floor(elapsedMs / DAY)),
    isFirstLaunch: created,
    clockWentBackwards: elapsedMs < 0,
    grownNoteIds: [],
    weededNoteIds: [],
    now,
  };

  // Cihaz saati geri alınmış: damgayı düzelt, tarlaya dokunma. Aksi halde
  // kullanıcı saati ileri/geri oynatarak durumları bozabilir.
  if (base.clockWentBackwards) {
    await setLastOpenedAt(now);
    return base;
  }

  // İlk açılışta simüle edilecek geçmiş yok.
  if (created) return base;

  // Uygulamayı saniyeler içinde tekrar açmak yazma tetiklemesin. Damgayı da
  // güncellemiyoruz ki kısa aralıklar birikip eşiği doğal yoldan aşsın.
  if (!options.force && elapsedMs < rules.minSkipMs) return base;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    status: string;
    seed_type: string;
    created_at: number;
    last_tended_at: number;
  }>(
    `SELECT id, status, seed_type, created_at, last_tended_at
       FROM notes
      WHERE harvested_at IS NULL`,
  );

  const notes: SimulatableNote[] = rows.map((row) => ({
    id: row.id,
    status: toNoteStatus(row.status),
    seed_type: toSeedType(row.seed_type),
    created_at: row.created_at,
    last_tended_at: row.last_tended_at,
  }));

  const plan = computeSkipPlan(notes, now, rules);

  // Statü güncellemeleri ve açılış damgası tek transaction: yarıda kalırsa
  // last_opened_at eski kalır ve simülasyon sonraki açılışta tekrar dener.
  // Yazmalar `txn` üzerinden gider; exclusive blok içinde `db` kullanmak
  // kendi kilidini bekleyeceği için kilitlenme demektir.
  await db.withExclusiveTransactionAsync(async (txn) => {
    await setNoteStatuses(plan.grownNoteIds, 'growing', txn);
    await setNoteStatuses(plan.weededNoteIds, 'weedy', txn);
    await setLastOpenedAt(now, txn);
  });

  return {
    ...base,
    didRun: true,
    grownNoteIds: plan.grownNoteIds,
    weededNoteIds: plan.weededNoteIds,
  };
}
