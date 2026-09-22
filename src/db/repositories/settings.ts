// Ayarlar tablosu. Tek satır var (id = 1).
// Time-skip'in baktığı `last_opened_at` burada duruyor.
import type { Settings, SettingsRow } from '../../types';
import { getDatabase, type Database } from '../database';
import { mapSettings } from '../mappers';
import { SETTINGS_ROW_ID } from '../schema';

export interface EnsureSettingsResult {
  settings: Settings;
  /** Satır bu çağrıda açıldıysa true, yani ilk açılış. */
  created: boolean;
}

/**
 * Ayar satırını okur, yoksa `now` ile açar.
 *
 * İlk açılışta last_opened_at'i "şimdi" yapmak şart. 0 bırakınca time-skip
 * aradaki 56 yılı geçmiş sanıp bütün notları otlandırıyor.
 */
export async function ensureSettings(
  now: number = Date.now(),
): Promise<EnsureSettingsResult> {
  const db = await getDatabase();

  const insert = await db.runAsync(
    'INSERT OR IGNORE INTO settings (id, last_opened_at) VALUES (?, ?)',
    [SETTINGS_ROW_ID, now],
  );

  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT * FROM settings WHERE id = ?',
    [SETTINGS_ROW_ID],
  );
  if (!row) throw new Error('ensureSettings: ayar satiri okunamadi');

  return { settings: mapSettings(row), created: insert.changes > 0 };
}

export async function getSettings(): Promise<Settings | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT * FROM settings WHERE id = ?',
    [SETTINGS_ROW_ID],
  );
  return row ? mapSettings(row) : null;
}

/**
 * Açılış damgasını günceller. Time-skip hesabı bittikten SONRA çağrılmalı,
 * yoksa geçen süre sıfırlanıyor ve simülasyon hiç çalışmıyor.
 *
 * executor: exclusive transaction içinden çağırıyorsanız transaction
 * nesnesini verin. Orada global `db` ile yazmak kendi kilidini beklediği
 * için uygulama donuyor.
 */
export async function setLastOpenedAt(
  now: number = Date.now(),
  executor?: Database,
): Promise<void> {
  const db = executor ?? (await getDatabase());
  await db.runAsync(
    'INSERT INTO settings (id, last_opened_at) VALUES (?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET last_opened_at = excluded.last_opened_at',
    [SETTINGS_ROW_ID, now],
  );
}
