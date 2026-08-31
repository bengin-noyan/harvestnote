/**
 * Açılış akışı: veritabanını hazırla -> zamanı simüle et -> tarla özetini
 * çıkar. Sıra önemlidir; time-skip migration'lar bitmeden çalışamaz.
 */
import { initDatabase } from './db/database';
import { getFieldStats, type FieldStats } from './db/repositories/notes';
import { runTimeSkip, type RunTimeSkipOptions } from './game/timeSkip';
import {
  configureNotifications,
  syncWeedReminders,
} from './notifications/weedReminders';
import type { TimeSkipResult } from './types';

export interface BootstrapResult {
  timeSkip: TimeSkipResult;
  stats: FieldStats;
}

export async function bootstrapApp(
  options: RunTimeSkipOptions = {},
): Promise<BootstrapResult> {
  await initDatabase();
  const timeSkip = await runTimeSkip(options);
  const stats = await getFieldStats();

  // Bildirim kurulumu açılışı bloklamamalı: kanal/handler kurulamazsa bile
  // uygulama çalışır, yalnızca hatırlatma gelmez.
  try {
    await configureNotifications();
  } catch (error) {
    if (__DEV__) console.warn('[bootstrap] bildirimler kurulamadi', error);
  }
  // syncWeedReminders kendi hatalarını zaten yutuyor.
  await syncWeedReminders(timeSkip.now);

  return { timeSkip, stats };
}
