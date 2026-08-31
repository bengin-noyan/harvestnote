/**
 * Tarla ekranının veri kancası: repository çağrılarını sarar, iyimser
 * (optimistic) güncelleme yapar ve provider'ın `revision` sayacına abone olur.
 *
 * İyimser güncelleme burada kozmetik değil: hasat animasyonu biterken kartın
 * listede kalıp bir kare sonra kaybolması "takılma" gibi hissettiriyordu.
 */
import { useCallback, useEffect, useState } from 'react';

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
  loading: boolean;
  reload: () => Promise<void>;
  plant: (input: CreateNoteInput) => Promise<void>;
  tend: (id: number) => Promise<void>;
  harvest: (id: number) => Promise<void>;
  save: (id: number, input: UpdateNoteInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useNotes(): UseNotesResult {
  const { revision, notifyChange, status } = useFarm();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const rows = await listFieldNotes();
    setNotes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;

    listFieldNotes()
      .then((rows) => {
        if (cancelled) return;
        setNotes(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (__DEV__) console.warn('[notes] liste okunamadi', err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, revision]);

  const plant = useCallback(
    async (input: CreateNoteInput) => {
      const note = await plantSeed(input);
      setNotes((prev) => [note, ...prev]);
      notifyChange();
    },
    [notifyChange],
  );

  const tend = useCallback(
    async (id: number) => {
      const updated = await tendNote(id);
      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      }
      notifyChange();
    },
    [notifyChange],
  );

  const harvest = useCallback(
    async (id: number) => {
      // Kart zaten küçülüp kayboldu; listeden hemen düşür.
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await harvestNote(id);
      notifyChange();
    },
    [notifyChange],
  );

  const save = useCallback(
    async (id: number, input: UpdateNoteInput) => {
      const updated = await updateNote(id, input);
      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      }
      notifyChange();
    },
    [notifyChange],
  );

  const remove = useCallback(
    async (id: number) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await deleteNote(id);
      notifyChange();
    },
    [notifyChange],
  );

  return { notes, loading, reload, plant, tend, harvest, save, remove };
}
