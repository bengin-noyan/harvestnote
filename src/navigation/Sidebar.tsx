/**
 * Çalışma alanı kenar çubuğu — Notion'ın sol sütununun karşılığı.
 *
 * İçerik sırası bilinçli: önce *arama*, sonra *görünümler*, sonra *notlar*.
 * Notion'da da böyle; aradığın şeye ya adıyla ya da bulunduğu görünümle
 * ulaşırsın, ikisi de listenin üstünde durur.
 *
 * Kenar çubuğu kağıdın bir tık içine gömülü (`surfaceSunken`): içerik alanı
 * beyaz kalsın, göz nereye bakacağını kenarlıktan değil zemin farkından
 * anlasın.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SEED_CATALOG } from '../game/config';
import { resolveStage } from '../game/stages';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { TodoCount } from '../db/repositories/blocks';
import type { Note } from '../types';

/** Ana içerik alanında ne gösterildiği. */
export type WorkspaceView = 'farm' | 'list' | 'inventory';

interface ViewEntry {
  key: WorkspaceView;
  label: string;
  icon: string;
}

const VIEWS: ViewEntry[] = [
  { key: 'farm', label: 'Tarla', icon: '🌾' },
  { key: 'list', label: 'Liste', icon: '☰' },
  { key: 'inventory', label: 'Kiler', icon: '🧺' },
];

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  view: WorkspaceView;
  openNoteId: number | null;
  search: string;
  onSearch: (value: string) => void;
  onSelectView: (view: WorkspaceView) => void;
  onSelectNote: (id: number) => void;
  onAdd: () => void;
  /** Dar ekranda çekmeceyi kapatan düğme; geniş ekranda gizli. */
  onClose?: () => void;
}

export function Sidebar({
  notes,
  labor,
  now,
  view,
  openNoteId,
  search,
  onSearch,
  onSelectView,
  onSelectNote,
  onAdd,
  onClose,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>🌾 HarvestNote</Text>
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Kenar çubuğunu kapat"
          >
            <Text style={styles.close}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        value={search}
        onChangeText={onSearch}
        placeholder="Ara"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        accessibilityLabel="Notlarda ara"
      />

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.add, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityLabel="Yeni tohum ek"
      >
        <Text style={styles.addText}>＋ Yeni tohum</Text>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>Görünümler</Text>
        {VIEWS.map((entry) => {
          // Not açıkken hiçbir görünüm "seçili" görünmemeli: içerik alanında
          // duran şey o görünüm değil, notun sayfası.
          const active = openNoteId === null && view === entry.key;
          return (
            <Pressable
              key={entry.key}
              onPress={() => onSelectView(entry.key)}
              style={({ pressed }) => [
                styles.row,
                active ? styles.rowActive : null,
                pressed ? styles.pressed : null,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.rowIcon}>{entry.icon}</Text>
              <Text style={[styles.rowText, active ? styles.rowTextActive : null]}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.section}>
          {search.trim() ? 'Sonuçlar' : 'Notlar'}
        </Text>
        {notes.length === 0 ? (
          <Text style={styles.empty}>
            {search.trim() ? 'Eşleşen not yok' : 'Henüz tohum ekilmedi'}
          </Text>
        ) : (
          notes.map((note) => {
            const stage = resolveStage(note, now, undefined, labor.get(note.id));
            const active = openNoteId === note.id;
            return (
              <Pressable
                key={note.id}
                onPress={() => onSelectNote(note.id)}
                style={({ pressed }) => [
                  styles.row,
                  active ? styles.rowActive : null,
                  pressed ? styles.pressed : null,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.rowIcon}>
                  {SEED_CATALOG[note.seed_type]?.emoji ?? '🌾'}
                </Text>
                <Text
                  style={[styles.rowText, active ? styles.rowTextActive : null]}
                  numberOfLines={1}
                >
                  {note.title}
                </Text>
                {/* Aşama rozeti değil nokta: liste sakin kalsın. */}
                <View
                  style={[
                    styles.stageDot,
                    { backgroundColor: STAGE_COLORS[stage].accent },
                  ]}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export const SIDEBAR_WIDTH = 268;

const styles = StyleSheet.create({
  root: {
    width: SIDEBAR_WIDTH,
    flex: 1,
    backgroundColor: colors.surfaceSunken,
    borderRightWidth: borders.hairline,
    borderRightColor: colors.rule,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: { ...typography.heading, color: colors.textPrimary },
  close: { ...typography.heading, color: colors.textMuted },
  /**
   * Arama kutusu kenarlıksız: kenar çubuğu zaten gömülü bir yüzey, kutunun
   * kendi çerçevesi olunca iki kat girinti gibi duruyordu.
   */
  search: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  add: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  addText: { ...typography.body, color: colors.leafDeep },
  scroll: { flex: 1 },
  section: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 1,
  },
  /** Seçili satır kenarlıkla değil zeminle işaretleniyor. */
  rowActive: { backgroundColor: colors.rule },
  pressed: { backgroundColor: colors.ruleStrong },
  rowIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  rowText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  rowTextActive: { color: colors.textPrimary },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
