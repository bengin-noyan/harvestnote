/**
 * Settings repository'si — tek satırlık (id = 1) singleton tablo.
 * Time-skip'in referans noktası `last_opened_at` burada tutulur.
 */
import type { Settings, SettingsRow } from '../../types';
import { getDatabase, type Database } from '../database';
import { mapSettings } from '../mappers';
import { SETTINGS_ROW_ID } from '../schema';

export interface EnsureSettingsResult {
  settings: Settings;
  /** Satır bu çağrıda oluşturulduysa true — yani ilk açılış. */
  created: boolean;
}

/**
 * Ayar satırını okur, yoksa `now` ile oluşturur.
 *
 * İlk açılışta `last_opened_at`'i "şimdi" yapmak kritik: 0 bırakılsaydı
 * time-skip ilk açılışta 56 yıllık bir boşluk görüp her şeyi ot bastırırdı.
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
 * Açılış damgasını günceller. Time-skip hesabı BİTTİKTEN sonra çağrılmalı,
 * yoksa geçen süre sıfırlanır ve simülasyon hiç çalışmaz.
 *
 * `executor`: exclusive bir transaction içinden çağrılıyorsa transaction
 * nesnesi verilmeli — expo-sqlite'ta o sırada global `db` üzerinden yazmak
 * kilidi beklediği için kilitlenmeye yol açar.
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
