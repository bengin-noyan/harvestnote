// Öncelik adları ve etiket renkleri. Not sayfası, tablo ve kart aynı yerden okusun.
import type { Priority, TagColor } from '../../types';

export const PRIORITY_META: Record<Priority, { label: string; color: TagColor }> = {
  0: { label: 'Yok', color: 'gray' },
  1: { label: 'Düşük', color: 'blue' },
  2: { label: 'Orta', color: 'yellow' },
  3: { label: 'Yüksek', color: 'red' },
};

// Seçicide yüksekten düşüğe gösteriyoruz, "Yok" en altta.
export const PRIORITY_ORDER: Priority[] = [3, 2, 1, 0];
