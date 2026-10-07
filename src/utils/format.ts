// Tarih ve süre yazdırma yardımcıları.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "3 saat önce", "2 gün önce". */
export function formatRelative(ms: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return 'az önce';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} dk önce`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} saat önce`;
  return `${Math.floor(diff / DAY)} gün önce`;
}

/** Kalan süre için: "4 saat", "2 gün". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'şimdi';
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} dk`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} saat`;
  return `${Math.round(ms / DAY)} gün`;
}

/* Son tarih (migration 4). due_at o günün başı, yerel saat. */

/** Verilen anın gün başı (yerel 00:00). */
export function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Gün ekliyor. 24 saat eklemek yaz saatinde günü kaydırıyordu, o yüzden
 * takvim günü üzerinden gidiyoruz.
 */
export function addDays(dayStart: number, days: number): number {
  const date = new Date(dayStart);
  date.setDate(date.getDate() + days);
  return startOfDay(date.getTime());
}

/** Bugüne göre kaç gün sonra (geçmişse eksi). */
export function daysUntil(dueAt: number, now: number = Date.now()): number {
  return Math.round((startOfDay(dueAt) - startOfDay(now)) / DAY);
}

export type DueTone = 'overdue' | 'soon' | 'later';

/** "Bugün", "Yarın", "3 gün geçti", "12 Eki 2026" gibi. */
export function formatDue(
  dueAt: number,
  now: number = Date.now(),
): { label: string; tone: DueTone } {
  const days = daysUntil(dueAt, now);
  if (days < -1) return { label: `${-days} gün geçti`, tone: 'overdue' };
  if (days === -1) return { label: 'Dün', tone: 'overdue' };
  if (days === 0) return { label: 'Bugün', tone: 'soon' };
  if (days === 1) return { label: 'Yarın', tone: 'soon' };
  if (days < 7) return { label: `${days} gün sonra`, tone: 'later' };
  return { label: formatDate(dueAt), tone: 'later' };
}
