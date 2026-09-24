/**
 * Tarla ekranının verisi. Repository çağrılarını sarıyor, optimistic
 * güncelleme yapıyor ve provider'daki `revision` sayacını dinliyor.
 *
 * Optimistic güncelleme şart: hasat animasyonu bitince kart bir kare daha
 * listede kalıyordu ve uygulama takılıyormuş gibi duruyordu.
 */
import { useCallback, useEffect, useState } from 'react';

import { getTodoCounts, type TodoCount } from '../db/repositories/blocks';
import {
  deleteNote,
  harvestNote,
  listFieldNotes,
  plantSeed,
  setFavorite,
  tendNote,
  updateNote,
} from '../db/repositories/notes';
import { useFarm } from '../providers/FarmProvider';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../types';

export interface UseNotesResult {
  notes: Note[];
  /**
   * Not id'sine göre yapılacak sayısı. Olgunluğun emek kısmı buradan geliyor.
   * Todo bloğu olmayan not eskisi gibi sadece zamanla olgunlaşıyor.
   */
  labor: Map<number, TodoCount>;
  loading: boolean;
  reload: () => Promise<void>;
  plant: (input: CreateNoteInput) => Promise<void>;
  tend: (id: number) => Promise<void>;
  harvest: (id: number) => Promise<void>;
  save: (id: number, input: UpdateNoteInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
}

export function useNotes(): UseNotesResult {
  // Aşağıdaki beş yazma da zamanlama kanalını kullanıyor. Ekim yeni hatırlatma
  // açıyor, hasat ve silme kuruluyu iptal ediyor, ot temizleme ve düzenleme de
  // last_tended_at'i tazeleyip hatırlatmayı ileri kaydırıyor (bkz. updateNote).
  // toggleFavorite ot saatine dokunmadığı için notifyContentChanged kullanıyor.
  const { revision, notifyScheduleChanged, notifyContentChanged, status } =
    useFarm();
  const [notes, setNotes] = useState<Note[]>([]);
  const [labor, setLabor] = useState<Map<number, TodoCount>>(new Map());
  const [loading, setLoading] = useState(true);

  /** Liste ve sayımı birlikte okuyoruz, ikisi aynı ana ait olsun. */
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
      // Kart zaten animasyonla kayboldu, listeden de hemen çıkaralım.
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

  const toggleFavorite = useCallback(
    async (id: number) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      const next = target.favorited_at === null;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, favorited_at: next ? Date.now() : null } : n,
        ),
      );
      await setFavorite(id, next);
      notifyContentChanged();
    },
    [notes, notifyContentChanged],
  );

  return {
    notes,
    labor,
    loading,
    reload,
    plant,
    tend,
    harvest,
    save,
    remove,
    toggleFavorite,
  };
}
