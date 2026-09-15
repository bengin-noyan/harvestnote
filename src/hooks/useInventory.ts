/** Kiler ekranının veri kancası. */
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
  /** SEED_CATALOG değerlerine göre toplam hasat puanı. */
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
      // Kiler yazması tarladaki hiçbir notun `last_tended_at`'ine dokunmaz,
      // yani kurulu hiçbir hatırlatmanın anı değişmez: içerik kanalı yeterli.
      notifyContentChanged();
    },
    [notifyContentChanged],
  );

  const totalValue = summary.reduce((sum, entry) => sum + entry.value, 0);

  return { items, summary, totalValue, loading, reload, discard };
}
