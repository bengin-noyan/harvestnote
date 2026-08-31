/**
 * Paylaşılan "şimdi" saati.
 *
 * Görsel aşama (`resolveStage`) zamanın fonksiyonu olduğu için kartların
 * kendiliğinden olgunlaşması gerekiyor. Her kart kendi zamanlayıcısını
 * kurarsa 30 tohumda 30 interval olur; onun yerine ekran tek bir saat
 * tutup değeri aşağıya prop olarak geçiyor.
 */
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
