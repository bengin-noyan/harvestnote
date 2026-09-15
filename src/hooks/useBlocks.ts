/**
 * Blok editörünün veri kancası.
 *
 * İki farklı yazma ritmi var ve ayrımı bu dosyanın tamamını belirliyor:
 *
 * - **Metin** yerelde anında değişir, DB'ye debounce'lu iner. Her tuş vuruşunda
 *   SQLite'a yazmanın anlamı yok; kullanıcı duraklayınca tek yazma yeter.
 * - **Yapısal işler** (blok ekleme/silme/birleştirme) önce bekleyen metni
 *   yazar, sonra DB'de çalışır, sonra listeyi tazeler. Yapı değişirken yerel
 *   listeyi tahmin etmeye çalışmak, pozisyon hesabını iki yerde tekrarlamak
 *   demek olurdu.
 *
 * Her yazma `notes.last_tended_at`'i tazelediği için (yazmak bir bakımdır)
 * bildirim kanalı `notifyScheduleChanged` — eşitleme zaten debounce'lu,
 * bkz. `requestReminderSync`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createBlock,
  deleteBlock,
  listBlocksForEditing,
  updateBlock,
} from '../db/repositories/blocks';
import { useFarm } from '../providers/FarmProvider';
import type { BlockType, NoteBlock } from '../types';

/** Yazma durduktan ne kadar sonra DB'ye inilecek. */
const AUTOSAVE_DELAY_MS = 600;

/** Birleştirme sonrası imlecin duracağı yer. */
export interface MergeTarget {
  blockId: number;
  caret: number;
}

export interface UseBlocksResult {
  blocks: NoteBlock[];
  loading: boolean;
  /** Metin değişti: yerelde anında, DB'ye debounce'lu. */
  setText: (id: number, text: string) => void;
  /**
   * Bloğu parçalara böler. `parts[0]` mevcut blokta kalır, kalanı ardına
   * yeni blok olarak girer (yapıştırılan çok satırlı metin de buradan geçer).
   * Odaklanılacak son bloğun id'sini döndürür.
   */
  splitBlock: (
    id: number,
    parts: string[],
    type: BlockType,
  ) => Promise<number | null>;
  /** Tür değiştirir; `text` verilirse metni de birlikte yazar. */
  convert: (id: number, type: BlockType, text?: string) => Promise<void>;
  toggleCheck: (id: number) => Promise<void>;
  /**
   * Satır başındaki Backspace: bloğu bir öncekinin sonuna ekler ve siler.
   * İlk bloktaysa ya da öncesi ayraçsa null döner (ayraç ayrıca silinir).
   */
  mergeWithPrevious: (id: number) => Promise<MergeTarget | null>;
  /** Bloğu siler; odaklanılacak komşunun id'sini döndürür. */
  removeBlock: (id: number) => Promise<number | null>;
  /** Bekleyen otomatik kaydı hemen yazar (panel kapanırken). */
  flush: () => Promise<void>;
}

export function useBlocks(noteId: number | null): UseBlocksResult {
  const { notifyScheduleChanged } = useFarm();
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  /** Yazılmayı bekleyen metinler: blok id -> metin. */
  const pending = useRef(new Map<number, string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Async geri çağrılarda güncel listeyi okumak için (bayat closure olmasın). */
  const latest = useRef<NoteBlock[]>([]);

  latest.current = blocks;

  const reload = useCallback(async () => {
    if (noteId === null) return;
    const rows = await listBlocksForEditing(noteId);
    setBlocks(rows);
    latest.current = rows;
  }, [noteId]);

  /* ---------------------------------------------------------------- */
  /* Otomatik kayıt                                                    */
  /* ---------------------------------------------------------------- */

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const entries = [...pending.current.entries()];
    pending.current.clear();
    if (entries.length === 0) return;

    try {
      for (const entry of entries) {
        const [id, text] = entry;
        await updateBlock(id, { text });
      }
      notifyScheduleChanged();
    } catch (error) {
      if (__DEV__) console.warn('[blocks] otomatik kayit basarisiz', error);
    }
  }, [notifyScheduleChanged]);

  /** Son hâli ref'te: unmount temizliğinin bayat flush çağırmaması için. */
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const setText = useCallback(
    (id: number, text: string) => {
      setBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, text } : block)),
      );
      pending.current.set(id, text);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flushRef.current();
      }, AUTOSAVE_DELAY_MS);
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Yükleme                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (noteId === null) {
      setBlocks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    listBlocksForEditing(noteId)
      .then((rows) => {
        if (cancelled) return;
        setBlocks(rows);
        latest.current = rows;
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('[blocks] okunamadi', error);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Başka bir nota geçiliyor ya da editör kapanıyor: bekleyen metin
      // kaybolmasın.
      void flushRef.current();
    };
  }, [noteId]);

  /* ---------------------------------------------------------------- */
  /* Yapısal işler                                                     */
  /* ---------------------------------------------------------------- */

  const splitBlock = useCallback(
    async (id: number, parts: string[], type: BlockType) => {
      if (noteId === null) return null;

      const head = parts[0] ?? '';
      const rest = parts.slice(1);

      // Bu bloğun metnini açıkça yazıyoruz; bekleyen kaydı düşür.
      pending.current.delete(id);
      await flush();

      try {
        await updateBlock(id, { text: head });

        let after = id;
        let lastId: number | null = null;
        for (const part of rest) {
          const block = await createBlock({
            note_id: noteId,
            type,
            text: part,
            after_block_id: after,
          });
          after = block.id;
          lastId = block.id;
        }

        await reload();
        notifyScheduleChanged();
        return lastId;
      } catch (error) {
        if (__DEV__) console.warn('[blocks] bolunemedi', error);
        return null;
      }
    },
    [noteId, flush, reload, notifyScheduleChanged],
  );

  const convert = useCallback(
    async (id: number, type: BlockType, text?: string) => {
      pending.current.delete(id);
      await flush();

      // Ayraç metin taşımaz — repository de temizliyor, yerel liste de
      // hemen aynı hâle gelsin ki kutu bir kare metinli görünmesin.
      const nextText = type === 'divider' ? '' : text;
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id
            ? { ...block, type, text: nextText ?? block.text }
            : block,
        ),
      );

      try {
        await updateBlock(id, text === undefined ? { type } : { type, text });
        notifyScheduleChanged();
      } catch (error) {
        if (__DEV__) console.warn('[blocks] tur degistirilemedi', error);
        await reload();
      }
    },
    [flush, reload, notifyScheduleChanged],
  );

  const toggleCheck = useCallback(
    async (id: number) => {
      const current = latest.current.find((block) => block.id === id);
      if (!current) return;
      const next = !current.checked;

      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, checked: next } : block,
        ),
      );

      try {
        await updateBlock(id, { checked: next });
        notifyScheduleChanged();
      } catch (error) {
        if (__DEV__) console.warn('[blocks] isaretlenemedi', error);
        await reload();
      }
    },
    [reload, notifyScheduleChanged],
  );

  const mergeWithPrevious = useCallback(
    async (id: number): Promise<MergeTarget | null> => {
      const list = latest.current;
      const index = list.findIndex((block) => block.id === id);
      const current = list[index];
      const previous = index > 0 ? list[index - 1] : undefined;
      if (!current || !previous) return null;

      pending.current.delete(id);
      pending.current.delete(previous.id);
      await flush();

      try {
        // Ayracın metni yok: birleştirilecek bir şey de yok, ayraç silinir
        // ve imleç bulunduğu blokta kalır.
        if (previous.type === 'divider') {
          await deleteBlock(previous.id);
          await reload();
          notifyScheduleChanged();
          return null;
        }

        const head = previous.text ?? '';
        const tail = current.text ?? '';
        await updateBlock(previous.id, { text: head + tail });
        await deleteBlock(id);
        await reload();
        notifyScheduleChanged();
        return { blockId: previous.id, caret: head.length };
      } catch (error) {
        if (__DEV__) console.warn('[blocks] birlestirilemedi', error);
        await reload();
        return null;
      }
    },
    [flush, reload, notifyScheduleChanged],
  );

  const removeBlock = useCallback(
    async (id: number): Promise<number | null> => {
      const list = latest.current;
      const index = list.findIndex((block) => block.id === id);
      if (index < 0) return null;
      // Silinenden sonra odak bir öncekine, yoksa bir sonrakine gider.
      const neighbour = list[index - 1] ?? list[index + 1] ?? null;

      pending.current.delete(id);
      await flush();

      try {
        await deleteBlock(id);
        await reload();
        notifyScheduleChanged();
        return neighbour?.id ?? null;
      } catch (error) {
        if (__DEV__) console.warn('[blocks] silinemedi', error);
        await reload();
        return null;
      }
    },
    [flush, reload, notifyScheduleChanged],
  );

  return {
    blocks,
    loading,
    setText,
    splitBlock,
    convert,
    toggleCheck,
    mergeWithPrevious,
    removeBlock,
    flush,
  };
}
