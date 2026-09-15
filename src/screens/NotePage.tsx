/**
 * Not sayfası — notun tam ekran hâli.
 *
 * Faz 1'de not alttan açılan bir paneldi (`maxHeight: 88%`), yani gövde her
 * zaman yarım görünüyordu ve klavye açılınca yazdığın satır ekranın dışına
 * çıkabiliyordu. Notion'ın en temel kararı notun bir *sayfa* olması; blok
 * editörünün nefes alabileceği tek düzen de bu.
 *
 * Ölçüm sütunu ~720px'de sabitleniyor: geniş bir tarayıcıda satırlar ekran
 * boyunca uzarsa göz satır başını kaybediyor.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BlockEditor } from '../components/editor/BlockEditor';
import { PixelButton } from '../components/PixelButton';
import { SEED_CATALOG } from '../game/config';
import { msUntilWeedy, resolveStage, STAGE_VISUALS } from '../game/stages';
import { useBlocks } from '../hooks/useBlocks';
import { reminderTimeFor } from '../notifications/weedReminders';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { Note, UpdateNoteInput } from '../types';
import { formatDuration, formatRelative } from '../utils/format';

/** Başlık da bloklarla aynı ritimde kaydedilsin. */
const TITLE_AUTOSAVE_MS = 600;

/** Okunabilir satır uzunluğu sınırı. */
export const PAGE_MAX_WIDTH = 720;

interface Props {
  note: Note;
  onBack: () => void;
  onSave: (id: number, input: UpdateNoteInput) => Promise<void>;
  onHarvest: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onHint: (message: string) => void;
}

export function NotePage({
  note,
  onBack,
  onSave,
  onHarvest,
  onDelete,
  onHint,
}: Props) {
  const [title, setTitle] = useState(note.title);
  const [busy, setBusy] = useState(false);

  const editor = useBlocks(note.id);

  const pendingTitle = useRef<string | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteId = useRef(note.id);
  noteId.current = note.id;

  /**
   * Başlık YALNIZCA başka bir nota geçilince sıfırlanır. `note` nesnesi
   * otomatik kayıt sonrası her tazelemede yeniden üretiliyor; efekt kimliğe
   * bakarsa kullanıcının yazdığını bir sonraki yazmada eski değerle ezerdi.
   */
  useEffect(() => {
    setTitle(note.title);
    setBusy(false);
  }, [note.id]);

  const flushTitle = useCallback(async () => {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    const next = pendingTitle.current;
    pendingTitle.current = null;
    // Boş başlık yazılmaz: `updateNote` zaten reddediyor, kullanıcı da
    // silerken adı kaybetmeyi beklemiyor — eski ad yerinde kalır.
    if (next === null || !next.trim()) return;
    try {
      await onSave(noteId.current, { title: next });
    } catch (error) {
      if (__DEV__) console.warn('[not] baslik kaydedilemedi', error);
    }
  }, [onSave]);

  const flushTitleRef = useRef(flushTitle);
  flushTitleRef.current = flushTitle;

  // Sayfadan çıkılırken bekleyen başlık yine de insin.
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
  const run = async (action: () => Promise<void>, hint: string) => {
    setBusy(true);
    try {
      await flushTitle();
      await editor.flush();
      await action();
      onHint(hint);
      onBack();
    } finally {
      setBusy(false);
    }
  };

  const stage = resolveStage(note);
  const visual = STAGE_VISUALS[stage];
  const seed = SEED_CATALOG[note.seed_type];
  const untilWeedy = msUntilWeedy(note);
  const untilReminder = reminderTimeFor(note) - Date.now();

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.pressed : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
        >
          <Text style={styles.backText}>← Tarla</Text>
        </Pressable>

        <View style={[styles.pill, { borderColor: STAGE_COLORS[stage].accent }]}>
          <Text style={styles.pillText}>
            {visual.emoji} {visual.label}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <TextInput
            value={title}
            onChangeText={handleTitleChange}
            style={styles.title}
            placeholder="Adsız"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
            accessibilityLabel="Not başlığı"
          />

          <Text style={styles.meta}>
            {seed?.emoji} {seed?.label} · {formatRelative(note.created_at)} ekildi
          </Text>

          <View style={styles.statusRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {untilWeedy > 0
                  ? `🌿 ${formatDuration(untilWeedy)} sonra ot basar`
                  : '🥀 ot bastı'}
              </Text>
            </View>
            {untilReminder > 0 ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  🔔 {formatDuration(untilReminder)} sonra hatırlatılacak
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.editor}>
            <BlockEditor editor={editor} />
          </View>

          <View style={styles.footer}>
            <PixelButton
              label={stage === 'harvestable' ? 'Hasat Et' : 'Erken Hasat'}
              icon="🧺"
              style={styles.flexButton}
              disabled={busy}
              onPress={() =>
                void run(() => onHarvest(note.id), 'Hasat kilere düştü. 🧺')
              }
            />
            <PixelButton
              label="Tohumu Sök"
              icon="🗑"
              tone="danger"
              disabled={busy}
              onPress={() =>
                void run(() => onDelete(note.id), 'Tohum söküldü.')
              }
            />
          </View>

          <Text style={styles.footnote}>
            {stage === 'harvestable'
              ? 'Ürün olgun: kilere altın kalitede düşecek.'
              : 'Olgunlaşmadan hasat edersen kilere normal kalitede düşer.'}
            {'  ·  '}Sökülen tohum kilere düşmez, tamamen kaybolur.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  /**
   * Üst şerit sayfanın bir parçası, ayrı bir başlık çubuğu değil: yalnızca
   * saç teli çizgi ayırıyor, zemin aynı kağıt.
   */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  backButton: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  backText: { ...typography.body, color: colors.textSecondary },
  pill: {
    borderWidth: borders.width,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  pillText: { ...typography.caption, color: colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  column: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center' },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    paddingHorizontal: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { ...typography.caption, color: colors.textSecondary },
  editor: {
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  flexButton: { flex: 1, minWidth: 160 },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
