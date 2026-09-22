/**
 * Zaman atlaması.
 *
 * Arka planda çalışan bir servis yok. Uygulama her açıldığında
 * settings.last_opened_at ile şimdi arasındaki farka bakıp o sürede olması
 * gerekenleri tek seferde uyguluyoruz. Pil yakmıyor, sonuç aynı.
 *
 * Kurallar:
 *  - last_tended_at üzerinden weedThresholdMs geçtiyse not 'weedy' olur.
 *  - 'planted' not türüne göre büyüme süresini doldurduysa 'growing' olur.
 *  - Ot büyümeyi eziyor, ikisi de olduysa sonuç 'weedy'.
 *  - Hasat edilmiş notlara (harvested_at dolu) dokunmuyoruz.
 */
import { getDatabase, withWriteTransaction } from '../db/database';
import { toNoteStatus, toSeedType } from '../db/mappers';
import {
  ensureSettings,
  setLastOpenedAt,
} from '../db/repositories/settings';
import { setNoteStatuses } from '../db/repositories/notes';
import type { TimeSkipResult } from '../types';
import { DAY, DEFAULT_GROWTH_RULES, type GrowthRules } from './config';
import { computeSkipPlan, type SimulatableNote } from './growth';

// Asıl hesap growth.ts'te, burada sadece DB ve zamanlama işi var.
export { computeSkipPlan, resolveStatus } from './growth';
export type { SimulatableNote, SkipPlan } from './growth';

export interface RunTimeSkipOptions {
  /** Test ederken "şimdi"yi dışarıdan verebilmek için. */
  now?: number;
  rules?: GrowthRules;
  /** Eşiğe bakmadan çalıştır. Dev menüsündeki "1 gün ileri sar" için. */
  force?: boolean;
}

/**
 * Açılışta bir kez çağrılıyor. Geçen süreyi ölçüyor, tarlayı güncelliyor,
 * last_opened_at'i tazeliyor. Dönen özetle "3 gün yoktun, 2 notunu ot bastı"
 * ekranını çizebiliyoruz.
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

  // Cihaz saati geri alınmış. Sadece damgayı düzeltip tarlaya dokunmuyoruz,
  // yoksa saatle oynayarak statüleri bozmak mümkün oluyor.
  if (base.clockWentBackwards) {
    await setLastOpenedAt(now);
    return base;
  }

  // İlk açılışta simüle edilecek geçmiş yok.
  if (created) return base;

  // Uygulamayı saniyeler içinde tekrar açınca boşuna yazma yapmayalım.
  // Damgayı da güncellemiyoruz ki kısa aralıklar birikip eşiği geçebilsin.
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

  // Statüler ve açılış damgası tek transaction'da. Yarıda kalırsa
  // last_opened_at eski kalıyor, simülasyon sonraki açılışta tekrar deniyor.
  // Yazmalar txn üzerinden gidiyor, burada `db` kullanmak kendi kilidini
  // beklediği için donduruyor.
  await withWriteTransaction(db, async (txn) => {
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
