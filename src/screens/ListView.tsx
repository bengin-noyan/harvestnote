/**
 * Liste görünümü — aynı veri, tarla ızgarası yerine satırlar.
 *
 * Tarla ızgarası durumu ve ilerlemeyi iyi anlatıyor ama *içeriği* göstermiyor:
 * parselde yalnızca başlık sığıyor. Liste bunun tersini yapıyor; her satırda
 * notun düz metin izdüşümünden bir önizleme var (`notes.content`, blokların
 * izdüşümü olarak zaten tazeleniyor — bu görünüm o sütunun ilk gerçek
 * müşterisi).
 */
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { SEED_CATALOG } from '../game/config';
import { maturityProgress, resolveStage, STAGE_VISUALS } from '../game/stages';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { TodoCount } from '../db/repositories/blocks';
import type { Note } from '../types';
import { formatRelative } from '../utils/format';
import { PAGE_MAX_WIDTH } from './NotePage';

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  searching: boolean;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd: () => void;
}

export function ListView({
  notes,
  labor,
  now,
  searching,
  onOpen,
  onTend,
  onAdd,
}: Props) {
  return (
    <FlatList
      data={notes}
      keyExtractor={(note) => String(note.id)}
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{searching ? 'Sonuçlar' : 'Liste'}</Text>
          <Text style={styles.subtitle}>
            {notes.length > 0
              ? `${notes.length} not`
              : searching
                ? 'Eşleşen not yok'
                : 'Henüz tohum ekilmedi'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        searching ? null : (
          <EmptyState
            emoji="🌱"
            title="Tarla boş"
            message="Yeni bir tohum ekerek başla; her not toprakta büyüyen bir ürün."
            onDark={false}
            actionLabel="Yeni tohum"
            onAction={onAdd}
          />
        )
      }
      renderItem={({ item }) => (
        <Row
          note={item}
          labor={labor.get(item.id)}
          now={now}
          onOpen={onOpen}
          onTend={onTend}
        />
      )}
    />
  );
}

function Row({
  note,
  labor,
  now,
  onOpen,
  onTend,
}: {
  note: Note;
  labor?: TodoCount;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
}) {
  const stage = resolveStage(note, now, undefined, labor);
  const visual = STAGE_VISUALS[stage];
  const seed = SEED_CATALOG[note.seed_type];
  /**
   * Ot basmış not listede de açılmaz — kartın ürün kuralı burada da geçerli.
   * Ama listede kaydırma jesti yok: temizlemenin tek yolu tarlaya gitmek
   * olsaydı kullanıcı kapana kısılırdı, o yüzden satır kendi düğmesini
   * gösteriyor. İhmalin bedeli duruyor, çıkışı görünür oluyor.
   */
  const blocked = stage === 'weedy';
  const progress = maturityProgress(note, now, undefined, labor);

  return (
    <Pressable
      onPress={() => (blocked ? onTend(note.id) : onOpen(note.id))}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      accessibilityRole="button"
      accessibilityLabel={
        blocked
          ? `${note.title} — ot bastı, temizlemek için dokun`
          : `${note.title} — ${visual.label}`
      }
    >
      <Text style={styles.emoji}>{seed?.emoji ?? '🌾'}</Text>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {note.title}
        </Text>
        {note.content ? (
          <Text style={styles.preview} numberOfLines={1}>
            {/* İzdüşüm satır sonu taşıyor; listede tek satıra indiriliyor. */}
            {note.content.replace(/\s+/g, ' ')}
          </Text>
        ) : (
          <Text style={[styles.preview, styles.previewEmpty]}>Boş</Text>
        )}

        {/*
          Olgunluk çubuğu: yüzde genişlik `DimensionValue`'yu karşılamıyor,
          o yüzden iki esneme oranı kullanılıyor (NoteCard'la aynı yöntem).
        */}
        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              { flex: progress, backgroundColor: STAGE_COLORS[stage].accent },
            ]}
          />
          <View style={{ flex: 1 - progress }} />
        </View>
      </View>

      <View style={styles.rowMeta}>
        {blocked ? (
          <Text style={styles.tend}>🌿 Temizle</Text>
        ) : (
          <View
            style={[
              styles.stageDot,
              { backgroundColor: STAGE_COLORS[stage].accent },
            ]}
          />
        )}
        <Text style={styles.time}>{formatRelative(note.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: PAGE_MAX_WIDTH,
    alignSelf: 'center',
  },
  header: { paddingBottom: spacing.lg, gap: 2 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  emoji: { fontSize: 20, paddingTop: 2 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.heading, color: colors.textPrimary },
  preview: { ...typography.caption, color: colors.textMuted },
  previewEmpty: { fontStyle: 'italic' },
  bar: {
    flexDirection: 'row',
    height: 2,
    marginTop: spacing.xs,
    backgroundColor: colors.rule,
    borderRadius: 1,
    overflow: 'hidden',
  },
  barFill: { height: 2 },
  rowMeta: { alignItems: 'flex-end', gap: spacing.xs, paddingTop: 4 },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  tend: { ...typography.caption, color: colors.leafDeep },
  time: { ...typography.caption, color: colors.textMuted },
  separator: { height: borders.hairline, backgroundColor: 'transparent' },
});
