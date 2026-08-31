/** Tarih/süre biçimlendirme yardımcıları (TR). */

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

/** "4 saat", "2 gün" — kalan süre için. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'şimdi';
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} dk`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} saat`;
  return `${Math.round(ms / DAY)} gün`;
}
