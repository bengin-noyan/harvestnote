// Açılış sırası: db'yi hazırla, geçen zamanı simüle et, tarla özetini al.
// Sıra önemli, migration bitmeden time-skip çalışmıyor.
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

  // Bildirim kurulumu patlarsa uygulama yine de açılsın, sadece hatırlatma
  // gelmez.
  try {
    await configureNotifications();
  } catch (error) {
    if (__DEV__) console.warn('[bootstrap] bildirimler kurulamadi', error);
  }
  // syncWeedReminders hatayı içeride yutuyor, ayrıca try'a gerek yok.
  await syncWeedReminders(timeSkip.now);

  return { timeSkip, stats };
}
