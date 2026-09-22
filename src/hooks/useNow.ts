/**
 * Tek bir "şimdi" değeri.
 *
 * Aşama zamana göre hesaplandığı için kartların kendiliğinden ilerlemesi
 * lazım. Her kart kendi setInterval'ini kurarsa 30 notta 30 timer oluyor,
 * onun yerine ekran tek saat tutup aşağıya prop geçiyor.
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
