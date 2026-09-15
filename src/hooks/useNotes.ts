/**
 * Tarla ekranının veri kancası: repository çağrılarını sarar, iyimser
 * (optimistic) güncelleme yapar ve provider'ın `revision` sayacına abone olur.
 *
 * İyimser güncelleme burada kozmetik değil: hasat animasyonu biterken kartın
 * listede kalıp bir kare sonra kaybolması "takılma" gibi hissettiriyordu.
 */
import { useCallback, useEffect, useState } from 'react';

import { getTodoCounts, type TodoCount } from '../db/repositories/blocks';
import {
  deleteNote,
  harvestNote,
  listFieldNotes,
  plantSeed,
  tendNote,
  updateNote,
} from '../db/repositories/notes';
import { useFarm } from '../providers/FarmProvider';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../types';

export interface UseNotesResult {
  notes: Note[];
  /**
   * Not id'sine göre yapılacak sayımı. Olgunluk hesabının emek payı buradan
   * geliyor; sayımı olmayan not (yapılacak bloğu yok) eskisi gibi yalnızca
   * zamanla olgunlaşır.
   */
  labor: Map<number, TodoCount>;
  loading: boolean;
  reload: () => Promise<void>;
  plant: (input: CreateNoteInput) => Promise<void>;
  tend: (id: number) => Promise<void>;
  harvest: (id: number) => Promise<void>;
  save: (id: number, input: UpdateNoteInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useNotes(): UseNotesResult {
  // Buradaki beş yazmanın hepsi zamanlama kanalını kullanıyor: ekim yeni bir
  // hatırlatma doğuruyor, hasat ve silme kurulu olanı geçersiz kılıyor, ot
  // temizleme ve düzenleme ise `last_tended_at`'i tazeleyerek hatırlatmanın
  // anını ileri kaydırıyor (bkz. updateNote).
  const { revision, notifyScheduleChanged, status } = useFarm();
  const [notes, setNotes] = useState<Note[]>([]);
  const [labor, setLabor] = useState<Map<number, TodoCount>>(new Map());
  const [loading, setLoading] = useState(true);

  /** Liste ve sayım birlikte okunur: ikisi aynı anın görüntüsü olmalı. */
  const load = useCallback(
    () => Promise.all([listFieldNotes(), getTodoCounts()]),
    [],
  );

  const reload = useCallback(async () => {
    const [rows, counts] = await load();
    setNotes(rows);
    setLabor(counts);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;

    load()
      .then(([rows, counts]) => {
        if (cancelled) return;
        setNotes(rows);
        setLabor(counts);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (__DEV__) console.warn('[notes] liste okunamadi', err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, revision, load]);

  const plant = useCallback(
    async (input: CreateNoteInput) => {
      const note = await plantSeed(input);
      setNotes((prev) => [note, ...prev]);
      notifyScheduleChanged();
    },
    [notifyScheduleChanged],
  );

  const tend = useCallback(
    async (id: number) => {
      const updated = await tendNote(id);
      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      }
      notifyScheduleChanged();
    },
    [notifyScheduleChanged],
  );

  const harvest = useCallback(
    async (id: number) => {
      // Kart zaten küçülüp kayboldu; listeden hemen düşür.
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await harvestNote(id);
      notifyScheduleChanged();
    },
    [notifyScheduleChanged],
  );

  const save = useCallback(
    async (id: number, input: UpdateNoteInput) => {
      const updated = await updateNote(id, input);
      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      }
      notifyScheduleChanged();
    },
    [notifyScheduleChanged],
  );

  const remove = useCallback(
    async (id: number) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await deleteNote(id);
      notifyScheduleChanged();
    },
    [notifyScheduleChanged],
  );

  return { notes, labor, loading, reload, plant, tend, harvest, save, remove };
}
