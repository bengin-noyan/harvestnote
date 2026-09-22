// Kiler ekranının verisi.
import { useCallback, useEffect, useState } from 'react';

import {
  getInventorySummary,
  listInventory,
  removeInventoryItem,
  type InventorySummaryEntry,
} from '../db/repositories/inventory';
import { useFarm } from '../providers/FarmProvider';
import type { InventoryItem } from '../types';

export interface UseInventoryResult {
  items: InventoryItem[];
  summary: InventorySummaryEntry[];
  /** Toplam hasat puanı. Değerler SEED_CATALOG'dan geliyor. */
  totalValue: number;
  loading: boolean;
  reload: () => Promise<void>;
  discard: (id: number) => Promise<void>;
}

export function useInventory(): UseInventoryResult {
  const { revision, notifyContentChanged, status } = useFarm();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [rows, groups] = await Promise.all([
      listInventory(),
      getInventorySummary(),
    ]);
    return { rows, groups };
  }, []);

  const reload = useCallback(async () => {
    const { rows, groups } = await load();
    setItems(rows);
    setSummary(groups);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;

    load()
      .then(({ rows, groups }) => {
        if (cancelled) return;
        setItems(rows);
        setSummary(groups);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (__DEV__) console.warn('[inventory] liste okunamadi', err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, revision, load]);

  const discard = useCallback(
    async (id: number) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      await removeInventoryItem(id);
      // Kiler yazması hiçbir notun last_tended_at'ini değiştirmiyor, yani
      // kurulu hatırlatmalar da kaymıyor. İçerik kanalı yeterli.
      notifyContentChanged();
    },
    [notifyContentChanged],
  );

  const totalValue = summary.reduce((sum, entry) => sum + entry.value, 0);

  return { items, summary, totalValue, loading, reload, discard };
}
