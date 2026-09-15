/**
 * Blok editörü — notun gövdesi.
 *
 * Bütün klavye kararları burada toplandı, çünkü hepsi komşu bloklara bakmayı
 * gerektiriyor ve `BlockRow`'un komşusu yok.
 *
 * Etkileşim sözleşmesi:
 *
 * | tuş / jest | koşul | sonuç |
 * | --- | --- | --- |
 * | Enter | liste bloğu ve satır boş | listeden çık (paragrafa dön) |
 * | Enter | diğer | bloğu böl; liste türleri kendini sürdürür |
 * | Backspace | satır başı, tür paragraf değil | paragrafa dön |
 * | Backspace | satır başı, paragraf | öncekiyle birleş |
 * | `/` | satır başında | blok menüsü |
 * | soldaki tutamak | her blok | tür menüsü + sil |
 *
 * Enter neden `onKeyPress` ile değil: Android'de `onKeyPress` yalnızca bazı
 * klavyelerde ve tuşlarda tetikleniyor. Çok satırlı `TextInput` ise satır
 * sonunu metnin *içinde* veriyor — onu `onChangeText`'te yakalamak iki
 * platformda da aynı çalışan tek yol.
 *
 * Backspace'i aynı şekilde yakalayamıyoruz (silme metne bir iz bırakmıyor),
 * o yüzden `onKeyPress` + imleç konumu kullanılıyor. Android'de boş kutuda
 * tetiklenmeme ihtimaline karşı tutamak menüsündeki "Bloğu sil" garantili
 * çıkış yolu olarak duruyor.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputSelectionChangeEventData,
} from 'react-native';

import type { UseBlocksResult } from '../../hooks/useBlocks';
import { colors, spacing, typography } from '../../theme';
import type { BlockType, NoteBlock } from '../../types';
import { BLOCK_META, BLOCK_MENU_ORDER, matchBlockTypes } from './blockMeta';
import { BlockMenu } from './BlockMenu';
import { BlockRow } from './BlockRow';

interface Props {
  /**
   * `useBlocks` sonucu dışarıdan geliyor: paneli kapatan ya da notu hasat
   * eden akışın bekleyen otomatik kaydı önce yazabilmesi (`flush`) gerekiyor,
   * o yüzden kanca editörün içinde değil onu barındıran panelde duruyor.
   */
  editor: UseBlocksResult;
}

/** İmleci taşımadan önce beklenen kare: odak Android'de imleci sona atıyor. */
const CARET_DELAY_MS = 16;

export function BlockEditor({ editor }: Props) {
  const {
    blocks,
    loading,
    setText,
    splitBlock,
    convert,
    toggleCheck,
    mergeWithPrevious,
    removeBlock,
  } = editor;

  const inputs = useRef(new Map<number, TextInput>());
  const selections = useRef(new Map<number, { start: number; end: number }>());

  /** Bir sonraki render'da odaklanılacak blok ve imleç yeri. */
  const [focusTarget, setFocusTarget] = useState<{
    blockId: number;
    caret: number | null;
  } | null>(null);

  /** `/` menüsünü açan blok ve `/` sonrası yazılanlar. */
  const [slash, setSlash] = useState<{ blockId: number; query: string } | null>(
    null,
  );
  /** Tutamakla açılan tür/sil menüsünün bloğu. */
  const [menuFor, setMenuFor] = useState<number | null>(null);
  /** Odaktaki blok — yalnızca tutamağı koyulaştırmak için. */
  const [activeId, setActiveId] = useState<number | null>(null);

  const registerRef = useCallback((id: number, ref: TextInput | null) => {
    if (ref) inputs.current.set(id, ref);
    else inputs.current.delete(id);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Odak                                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!focusTarget) return;
    const input = inputs.current.get(focusTarget.blockId);
    // Blok henüz render edilmediyse bir sonraki `blocks` değişiminde tekrar
    // denenecek; hedefi temizlemiyoruz.
    if (!input) return;

    const { caret } = focusTarget;
    setFocusTarget(null);
    input.focus();

    if (caret === null) return;
    const timer = setTimeout(() => {
      // setSelection RN 0.72+ ile geldi; yoksa imleç sonda kalır, kayıp yok.
      const withSelection = input as TextInput & {
        setSelection?: (start: number, end: number) => void;
      };
      withSelection.setSelection?.(caret, caret);
    }, CARET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [focusTarget, blocks]);

  const focusBlock = useCallback((blockId: number, caret: number | null) => {
    setFocusTarget({ blockId, caret });
  }, []);

  /* ---------------------------------------------------------------- */
  /* Sıra numaraları                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * `numbered` blokların gösterdiği sayı DB'de tutulmuyor: ardışık sıralı
   * maddelerin kaçıncısı olduğundan türetiliyor. Araya paragraf girerse
   * sayaç yeniden 1'den başlar — kullanıcının beklediği de bu.
   */
  const ordinals = useMemo(() => {
    const map = new Map<number, number>();
    let run = 0;
    for (const block of blocks) {
      if (block.type === 'numbered') {
        run += 1;
        map.set(block.id, run);
      } else {
        run = 0;
      }
    }
    return map;
  }, [blocks]);

  /* ---------------------------------------------------------------- */
  /* Klavye                                                            */
  /* ---------------------------------------------------------------- */

  const handleChangeText = useCallback(
    (block: NoteBlock, text: string) => {
      const meta = BLOCK_META[block.type];

      if (text.includes('\n')) {
        const parts = text.split('\n');
        setSlash(null);

        // Boş liste maddesinde Enter: yeni madde açma, listeden çık.
        if (meta.continues && parts.length === 2 && !parts[0] && !parts[1]) {
          void convert(block.id, 'paragraph', '');
          focusBlock(block.id, 0);
          return;
        }

        // Liste türleri kendini sürdürür; diğerleri paragrafa döner.
        const nextType: BlockType = meta.continues ? block.type : 'paragraph';
        void splitBlock(block.id, parts, nextType).then((newId) => {
          if (newId !== null) focusBlock(newId, 0);
        });
        return;
      }

      // `/` yalnızca satır başında menü açar. Boşluk gelirse kullanıcı blok
      // değil metin yazıyordur ("/usr/bin" gibi) — menü çekilir.
      if (text.startsWith('/') && !text.includes(' ')) {
        setSlash({ blockId: block.id, query: text.slice(1) });
      } else if (slash?.blockId === block.id) {
        setSlash(null);
      }

      setText(block.id, text);
    },
    [convert, focusBlock, setText, slash, splitBlock],
  );

  const handleKeyPress = useCallback(
    (
      block: NoteBlock,
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== 'Backspace') return;

      const selection = selections.current.get(block.id);
      // Satır başında değilsek normal silme; karışma.
      if (!selection || selection.start !== 0 || selection.end !== 0) return;

      // Önce türden çık: madde işaretini silmek isteyen kullanıcı bir üstteki
      // bloğun sonuna atlamayı beklemiyor.
      if (block.type !== 'paragraph') {
        void convert(block.id, 'paragraph');
        return;
      }

      void mergeWithPrevious(block.id).then((target) => {
        if (target) focusBlock(target.blockId, target.caret);
      });
    },
    [convert, focusBlock, mergeWithPrevious],
  );

  const handleSelectionChange = useCallback(
    (
      block: NoteBlock,
      event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      selections.current.set(block.id, event.nativeEvent.selection);
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Menüler                                                           */
  /* ---------------------------------------------------------------- */

  const applyType = useCallback(
    (blockId: number, type: BlockType, clearText: boolean) => {
      setSlash(null);
      setMenuFor(null);

      // `/baslik` yazısı bloğun metni olarak kalmamalı.
      void convert(blockId, type, clearText ? '' : undefined).then(() => {
        if (type !== 'divider') {
          focusBlock(blockId, clearText ? 0 : null);
          return;
        }
        // Ayracın metin kutusu yok; altına yazılacak bir paragraf açılır.
        void splitBlock(blockId, ['', ''], 'paragraph').then((newId) => {
          if (newId !== null) focusBlock(newId, 0);
        });
      });
    },
    [convert, focusBlock, splitBlock],
  );

  const handleDelete = useCallback(
    (blockId: number) => {
      setMenuFor(null);
      void removeBlock(blockId).then((neighbour) => {
        if (neighbour !== null) focusBlock(neighbour, null);
      });
    },
    [focusBlock, removeBlock],
  );

  /** Son bloğun altına dokunmak yeni paragraf açar. */
  const handleAppend = useCallback(() => {
    const last = blocks[blocks.length - 1];
    if (!last) return;

    // Son blok zaten boş bir paragrafsa yenisini açma, oraya odaklan.
    if (last.type === 'paragraph' && !(last.text ?? '').length) {
      focusBlock(last.id, 0);
      return;
    }

    void splitBlock(last.id, [last.text ?? '', ''], 'paragraph').then((newId) => {
      if (newId !== null) focusBlock(newId, 0);
    });
  }, [blocks, focusBlock, splitBlock]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.leafDeep} />
      </View>
    );
  }

  return (
    <View>
      {blocks.map((block) => (
        <View key={block.id}>
          <BlockRow
            block={block}
            ordinal={ordinals.get(block.id) ?? 1}
            active={activeId === block.id}
            registerRef={registerRef}
            onChangeText={(text) => handleChangeText(block, text)}
            onKeyPress={(event) => handleKeyPress(block, event)}
            onSelectionChange={(event) => handleSelectionChange(block, event)}
            onFocus={() => {
              setActiveId(block.id);
              setMenuFor(null);
            }}
            onToggleCheck={() => void toggleCheck(block.id)}
            onOpenMenu={() => {
              setSlash(null);
              // Aynı tutamağa ikinci dokunuş menüyü kapatsın.
              setMenuFor((current) => (current === block.id ? null : block.id));
            }}
          />

          {slash?.blockId === block.id ? (
            <BlockMenu
              items={matchBlockTypes(slash.query)}
              onSelect={(type) => applyType(block.id, type, true)}
            />
          ) : null}

          {menuFor === block.id ? (
            <BlockMenu
              items={BLOCK_MENU_ORDER.map((type) => BLOCK_META[type])}
              activeType={block.type}
              onSelect={(type) => applyType(block.id, type, false)}
              onDelete={() => handleDelete(block.id)}
            />
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={handleAppend}
        style={styles.appendRow}
        accessibilityRole="button"
        accessibilityLabel="Yeni blok ekle"
      >
        <Text style={styles.appendText}>＋ Blok ekle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  /**
   * Boş alan da dokunulabilir olmalı: Notion'da olduğu gibi notun altına
   * dokununca yazmaya devam edilir. Yükseklik parmak hedefi kadar.
   */
  appendRow: { paddingVertical: spacing.md },
  appendText: { ...typography.caption, color: colors.textMuted },
});
