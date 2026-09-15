/**
 * Not detay/düzenleme paneli.
 *
 * Ot basmış notlar buraya hiç ulaşmaz — NoteCard onları açmayı reddediyor.
 * Panel yalnızca okunabilir/düzenlenebilir aşamalar için var.
 *
 * Faz 1'den beri "Kaydet" butonu yok: hem başlık hem bloklar duraklayınca
 * kendiliğinden iniyor. Buton kalsaydı gövde otomatik, başlık elle kaydedilen
 * iki farklı sözleşme olurdu — kullanıcının hangi metnin güvende olduğunu
 * bilmesi imkânsız hale gelirdi.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BlockEditor } from './editor/BlockEditor';
import { SEED_CATALOG } from '../game/config';
import { msUntilWeedy, resolveStage, STAGE_VISUALS } from '../game/stages';
import { useBlocks } from '../hooks/useBlocks';
import { reminderTimeFor } from '../notifications/weedReminders';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { Note, UpdateNoteInput } from '../types';
import { formatDuration, formatRelative } from '../utils/format';
import { BottomSheet } from './BottomSheet';
import { PixelButton } from './PixelButton';

/** Başlık da bloklarla aynı ritimde kaydedilsin. */
const TITLE_AUTOSAVE_MS = 600;

interface Props {
  /** null = panel kapalı. */
  note: Note | null;
  onClose: () => void;
  onSave: (id: number, input: UpdateNoteInput) => Promise<void>;
  onHarvest: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function NoteDetailSheet({
  note,
  onClose,
  onSave,
  onHarvest,
  onDelete,
}: Props) {
  /**
   * Kapanış animasyonu oynarken içerik boşalmasın diye son görüntülenen not
   * saklanır: `note` null'a düşünce panel kapanır ama gövde bir an daha durur.
   */
  const [shown, setShown] = useState<Note | null>(note);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const editor = useBlocks(shown?.id ?? null);

  const pendingTitle = useRef<string | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Async kayıtta güncel not id'si — bayat closure'a düşmemek için. */
  const shownId = useRef<number | null>(null);
  shownId.current = shown?.id ?? null;

  /**
   * Başlık ve meşguliyet YALNIZCA başka bir nota geçilince sıfırlanır.
   * `note` nesnesi otomatik kayıt sonrası her tazelemede yeniden üretiliyor;
   * efekt kimliğe bakarsa kullanıcının yazdığı başlığı bir sonraki yazmada
   * DB'deki eski değerle ezerdi.
   */
  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setBusy(false);
  }, [note?.id]);

  // Aşama rozetleri ve sayaçlar tazelensin diye son not her zaman güncellenir.
  useEffect(() => {
    if (note) setShown(note);
  }, [note]);

  const flushTitle = useCallback(async () => {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    const next = pendingTitle.current;
    pendingTitle.current = null;
    const id = shownId.current;
    // Boş başlık yazılmaz: `updateNote` zaten reddediyor, kullanıcı da
    // silerken adı kaybetmeyi beklemiyor — eski ad yerinde kalır.
    if (next === null || id === null || !next.trim()) return;
    try {
      await onSave(id, { title: next });
    } catch (error) {
      if (__DEV__) console.warn('[not] baslik kaydedilemedi', error);
    }
  }, [onSave]);

  const flushTitleRef = useRef(flushTitle);
  flushTitleRef.current = flushTitle;

  // Panel kapanırken (bileşen sökülürken) bekleyen başlık yine de insin.
  useEffect(() => () => void flushTitleRef.current(), []);

  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    pendingTitle.current = text;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      titleTimer.current = null;
      void flushTitleRef.current();
    }, TITLE_AUTOSAVE_MS);
  }, []);

  /**
   * Hasat ve sökme geri alınamaz: bekleyen otomatik kayıtlar önce inmeli.
   * Hasat `harvested_at` damgaladıktan sonra blok izdüşümü artık nota
   * yazılamaz (`WHERE harvested_at IS NULL`) — sıra burada önemli.
   */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await flushTitle();
      await editor.flush();
      await action();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const stage = shown ? resolveStage(shown) : 'planted';
  const visual = STAGE_VISUALS[stage];
  const seed = shown ? SEED_CATALOG[shown.seed_type] : null;
  const untilWeedy = shown ? msUntilWeedy(shown) : 0;
  const untilReminder = shown ? reminderTimeFor(shown) - Date.now() : 0;

  return (
    <BottomSheet
      visible={note !== null}
      onClose={onClose}
      title={seed ? `${seed.emoji} ${seed.label}` : ''}
      subtitle={
        shown
          ? `${visual.label} · ${formatRelative(shown.created_at)} ekildi`
          : undefined
      }
    >
      {shown ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.statusRow}>
            <View style={[styles.pill, { borderColor: STAGE_COLORS[stage].accent }]}>
              <Text style={styles.pillText}>
                {visual.emoji} {visual.label}
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {untilWeedy > 0
                  ? `🌿 ${formatDuration(untilWeedy)} sonra ot basar`
                  : '🥀 ot bastı'}
              </Text>
            </View>
            {untilReminder > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  🔔 {formatDuration(untilReminder)} sonra hatırlatılacak
                </Text>
              </View>
            ) : null}
          </View>

          <TextInput
            value={title}
            onChangeText={handleTitleChange}
            style={styles.titleInput}
            placeholder="Görev adı"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
            accessibilityLabel="Görev adı"
          />

          <View style={styles.editor}>
            <BlockEditor editor={editor} />
          </View>

          <View style={styles.actions}>
            <PixelButton
              label={stage === 'harvestable' ? 'Hasat Et' : 'Erken Hasat'}
              icon="🧺"
              style={styles.flexButton}
              disabled={busy}
              onPress={() => run(() => onHarvest(shown.id))}
            />
          </View>

          <Text style={styles.footnote}>
            {stage === 'harvestable'
              ? 'Ürün olgun: kilere altın kalitede düşecek.'
              : 'Olgunlaşmadan hasat edersen kilere normal kalitede düşer.'}
          </Text>

          <View style={styles.dangerZone}>
            <PixelButton
              label="Tohumu Sök"
              icon="🗑"
              tone="danger"
              disabled={busy}
              onPress={() => run(() => onDelete(shown.id))}
            />
            <Text style={styles.footnote}>
              Sökülen tohum kilere düşmez, tamamen kaybolur.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    borderWidth: borders.width,
    borderColor: colors.ruleStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: { ...typography.caption, color: colors.textSecondary },
  /**
   * Başlık artık etiketli bir form alanı değil, belgenin başlığı: kutusu yok,
   * doğrudan sayfanın üstünde duruyor — "Notion önde" kararının editördeki
   * karşılığı.
   */
  titleInput: {
    ...typography.title,
    color: colors.textPrimary,
    paddingHorizontal: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  editor: {
    paddingBottom: spacing.md,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  flexButton: { flex: 1 },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 16,
  },
  dangerZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.rule,
    marginBottom: spacing.md,
  },
});
