/**
 * Not detay/düzenleme paneli.
 *
 * Ot basmış notlar buraya hiç ulaşmaz — NoteCard onları açmayı reddediyor.
 * Panel yalnızca okunabilir/düzenlenebilir aşamalar için var.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SEED_CATALOG } from '../game/config';
import { msUntilWeedy, resolveStage, STAGE_VISUALS } from '../game/stages';
import { reminderTimeFor } from '../notifications/weedReminders';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { Note, UpdateNoteInput } from '../types';
import { formatDuration, formatRelative } from '../utils/format';
import { BottomSheet } from './BottomSheet';
import { PixelButton } from './PixelButton';

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
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!note) return;
    setShown(note);
    setTitle(note.title);
    setContent(note.content ?? '');
    setBusy(false);
  }, [note]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
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

          <Text style={styles.label}>Görev adı</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            maxLength={80}
          />

          <Text style={styles.label}>Detay</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            style={[styles.input, styles.multiline]}
            multiline
            textAlignVertical="top"
            placeholder="Boş"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.actions}>
            <PixelButton
              label="Kaydet"
              icon="💾"
              tone="soil"
              style={styles.flexButton}
              disabled={busy || !title.trim()}
              onPress={() =>
                run(() =>
                  onSave(shown.id, {
                    title,
                    content: content.trim() ? content : null,
                  }),
                )
              }
            />
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
  label: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  /**
   * Metin kutusu kenarlıkla değil girintili zeminle anlatılıyor — form
   * alanları böylece sayfanın içinde durur, üstüne çizilmiş gibi değil.
   */
  input: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSunken,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  multiline: { minHeight: 110 },
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
