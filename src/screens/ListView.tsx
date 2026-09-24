/**
 * Tablo görünümü. Aynı notlar ama satır satır (ad, aşama, olgunluk, ekildi).
 *
 * Tarla kartlarına sadece başlık sığıyor, burada notun içinden bir önizleme
 * de gösteriyoruz. notes.content bloklardan otomatik güncellendiği için
 * ekstra bir şey yapmaya gerek kalmadı.
 *
 * Dar ekranda tablo yana kayıyor.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { DatabaseHeader } from '../components/ui/DatabaseHeader';
import { FadeIn, staggerDelay } from '../components/ui/FadeIn';
import { Icon, type IconName } from '../components/ui/Icon';
import { Tag } from '../components/ui/Tag';
import { SEED_CATALOG } from '../game/config';
import { maturityProgress, resolveStage, STAGE_VISUALS } from '../game/stages';
import { useHover } from '../hooks/useHover';
import { borders, radii, spacing, typography } from '../theme';
import type { TodoCount } from '../db/repositories/blocks';
import type { Note } from '../types';
import { formatRelative } from '../utils/format';
import type { FieldTab } from '../navigation/views';
import { FIELD_TABS } from './FarmView';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

// Sütun genişlikleri, Ad sütunu kalan yeri alıyor.
const COLUMNS = { stage: 150, maturity: 150, planted: 110 } as const;
const TABLE_MIN_WIDTH = 640;

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  searching: boolean;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd: () => void;
  onSelectTab: (tab: FieldTab) => void;
}

export function ListView({
  notes,
  labor,
  now,
  searching,
  onOpen,
  onTend,
  onAdd,
  onSelectTab,
}: Props) {
  const styles = useStyles();
  // Yatay ScrollView içinde width '100%' çalışmıyor, genişliği ölçüp
  // kendimiz veriyoruz.
  const [columnWidth, setColumnWidth] = useState(0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={styles.column}
        onLayout={(event) => setColumnWidth(event.nativeEvent.layout.width)}
      >
        <DatabaseHeader
          icon="🌾"
          title="Tarla"
          description={
            searching
              ? `${notes.length} sonuç`
              : 'Her not toprağa atılmış bir tohum. Yazdıkça ve bitirdikçe büyüyor.'
          }
          tabs={FIELD_TABS}
          activeTab="list"
          onSelectTab={onSelectTab}
          onNew={onAdd}
        />

        {notes.length === 0 && !searching ? (
          <EmptyState
            emoji="🌱"
            title="Tarla boş"
            message="Yeni bir tohum ekerek başla; her not toprakta büyüyen bir ürün."
            actionLabel="Yeni tohum"
            onAction={onAdd}
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
              style={[
                styles.table,
                { width: Math.max(TABLE_MIN_WIDTH, columnWidth) },
              ]}
            >
              <View style={styles.headRow}>
                <HeadCell icon="type" label="Ad" flex />
                <HeadCell icon="disc" label="Aşama" width={COLUMNS.stage} />
                <HeadCell icon="trending-up" label="Olgunluk" width={COLUMNS.maturity} />
                <HeadCell icon="calendar" label="Ekildi" width={COLUMNS.planted} />
              </View>

              {notes.map((note, index) => (
                <FadeIn key={note.id} delay={staggerDelay(index)} offset={4}>
                  <Row
                    note={note}
                    labor={labor.get(note.id)}
                    now={now}
                    onOpen={onOpen}
                    onTend={onTend}
                  />
                </FadeIn>
              ))}

              {searching ? null : <AddRow onPress={onAdd} />}
            </View>
          </ScrollView>
        )}

        {notes.length > 0 ? (
          <Text style={styles.count}>Sayı {notes.length}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function HeadCell({
  icon,
  label,
  width,
  flex = false,
}: {
  icon: IconName;
  label: string;
  width?: number;
  flex?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.cell, styles.headCell, flex ? styles.flexCell : { width }]}>
      <Icon name={icon} size={13} />
      <Text style={styles.headText}>{label}</Text>
    </View>
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
  const { stages } = useTheme();
  const styles = useStyles();
  const { hovered, bind } = useHover();
  const stage = resolveStage(note, now, undefined, labor);
  const visual = STAGE_VISUALS[stage];
  const seed = SEED_CATALOG[note.seed_type];
  /**
   * Otlu not listede de açılmıyor, karttaki kural burada da geçerli. Ama
   * listede kaydırma jesti yok. Temizlemenin tek yolu tarlaya gitmek olsaydı
   * kullanıcı sıkışıp kalırdı, o yüzden satır kendi düğmesini gösteriyor.
   */
  const blocked = stage === 'weedy';
  const progress = maturityProgress(note, now, undefined, labor);

  return (
    <Pressable
      onPress={() => (blocked ? onTend(note.id) : onOpen(note.id))}
      {...bind}
      style={({ pressed }) => [
        styles.row,
        hovered || pressed ? styles.rowHover : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        blocked
          ? `${note.title} — ot bastı, temizlemek için dokun`
          : `${note.title} — ${visual.label}`
      }
    >
      <View style={[styles.cell, styles.flexCell, styles.nameCell]}>
        <Text style={styles.emoji}>{seed?.emoji ?? '🌾'}</Text>
        <View style={styles.nameBody}>
          <Text style={styles.name} numberOfLines={1}>
            {note.title}
          </Text>
          {note.content ? (
            <Text style={styles.preview} numberOfLines={1}>
              {/* content'te satır sonları var, tek satıra çeviriyoruz */}
              {note.content.replace(/\s+/g, ' ')}
            </Text>
          ) : null}
        </View>
        {/* üstüne gelince çıkan küçük düğme */}
        {hovered ? (
          <View style={styles.openChip}>
            <Text style={styles.openText}>{blocked ? '🌿 Temizle' : 'Aç'}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.cell, { width: COLUMNS.stage }]}>
        <Tag
          label={visual.label}
          color={stages[stage].tag}
        />
      </View>

      <View style={[styles.cell, styles.barCell, { width: COLUMNS.maturity }]}>
        {/* yüzde genişlik TS'de hata veriyor, iki flex değeriyle yaptım */}
        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              { flex: progress, backgroundColor: stages[stage].accent },
            ]}
          />
          <View style={{ flex: 1 - progress }} />
        </View>
        <Text style={styles.muted}>%{Math.round(progress * 100)}</Text>
      </View>

      <View style={[styles.cell, { width: COLUMNS.planted }]}>
        <Text style={styles.muted} numberOfLines={1}>
          {formatRelative(note.created_at, now)}
        </Text>
      </View>
    </Pressable>
  );
}

function AddRow({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={({ pressed }) => [
        styles.addRow,
        hovered || pressed ? styles.rowHover : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Yeni tohum ek"
    >
      <Icon name="plus" size={14} />
      <Text style={styles.addText}>Yeni</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 3 },
  column: { width: '100%', maxWidth: 960, alignSelf: 'center' },
  table: { minWidth: TABLE_MIN_WIDTH },
  headRow: {
    flexDirection: 'row',
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  row: {
    flexDirection: 'row',
    minHeight: 40,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  rowHover: { backgroundColor: colors.surfaceSunken },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRightWidth: borders.hairline,
    borderRightColor: colors.rule,
  },
  flexCell: { flex: 1, minWidth: 230 },
  headCell: { gap: 6, paddingVertical: 8 },
  headText: { ...typography.body, color: colors.textSecondary },
  nameCell: { gap: spacing.sm },
  emoji: { fontSize: 16, lineHeight: 20 },
  nameBody: { flex: 1 },
  name: { ...typography.ui, color: colors.textPrimary },
  preview: { ...typography.caption, color: colors.textMuted },
  openChip: {
    borderWidth: borders.hairline,
    borderColor: colors.ruleStrong,
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    paddingHorizontal: 6,
  },
  openText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  barCell: { gap: spacing.sm },
  bar: {
    flex: 1,
    flexDirection: 'row',
    height: 4,
    backgroundColor: colors.rule,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
  muted: { ...typography.body, color: colors.textMuted },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  addText: { ...typography.body, color: colors.textMuted },
  count: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
}));
