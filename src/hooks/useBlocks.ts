/**
 * Blok editörünün verisi.
 *
 * İki ayrı yazma ritmi var, dosyanın tamamı bu ayrıma göre kurulu:
 *
 * - Metin yerelde anında değişiyor, DB'ye debounce ile iniyor. Her tuşta
 *   SQLite'a yazmanın anlamı yok, kullanıcı durunca tek yazma yetiyor.
 * - Yapısal işler (ekleme/silme/birleştirme) önce bekleyen metni yazıyor,
 *   sonra DB'de çalışıyor, sonra listeyi tazeliyor. Yapı değişirken yerel
 *   listeyi tahmin etmeye kalkarsam pozisyon hesabını ikinci kez yazmam
 *   gerekiyor.
 *
 * Her yazma notes.last_tended_at'i tazelediği için (yazmak da bakım sayılıyor)
 * bildirim kanalı notifyScheduleChanged. Eşitleme zaten debounce'lu,
 * bkz. requestReminderSync.
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
   * Bloğu parçalara bölüyor. parts[0] mevcut blokta kalıyor, kalanı arkasına
   * yeni blok olarak giriyor (yapıştırılan çok satırlı metin de buradan
   * geçiyor). Odaklanılacak son bloğun id'sini döndürüyor.
   */
  splitBlock: (
    id: number,
    parts: string[],
    type: BlockType,
  ) => Promise<number | null>;
  /** Tür değiştiriyor. text verilirse metni de yazıyor. */
  convert: (id: number, type: BlockType, text?: string) => Promise<void>;
  toggleCheck: (id: number) => Promise<void>;
  /**
   * Satır başındaki Backspace. Bloğu bir öncekinin sonuna ekleyip siliyor.
   * İlk bloktaysa ya da öncesi ayraçsa null dönüyor (ayracı da siliyor).
   */
  mergeWithPrevious: (id: number) => Promise<MergeTarget | null>;
  /** Bloğu siliyor, odaklanılacak komşunun id'sini döndürüyor. */
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
  /** Async callback'lerde güncel listeyi okumak için, closure bayatlamasın. */
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

  /** Son hali ref'te dursun ki unmount temizliği eski flush'ı çağırmasın. */
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
      // Başka nota geçiliyor ya da editör kapanıyor, bekleyen metin uçmasın.
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

      // Bu bloğun metnini zaten burada yazıyoruz, bekleyeni listeden çıkar.
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

      // Ayraçta metin olmuyor. Repository de temizliyor ama yerel liste de
      // hemen aynı olsun, yoksa kutu bir kare metinli görünüyor.
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
        // Ayracın metni yok, birleştirilecek bir şey de yok. Ayracı siliyoruz,
        // imleç bulunduğu blokta kalıyor.
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
      // Silince odak bir öncekine gidiyor, o yoksa bir sonrakine.
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
