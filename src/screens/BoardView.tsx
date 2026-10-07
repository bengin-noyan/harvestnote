/**
 * Pano görünümü. Notlar aşamaya, önceliğe ya da etikete göre sütunlarda.
 *
 * Kartları sürükleyip başka sütuna taşıma yok. Aşama zamana ve bitirilen
 * işlere göre hesaplanıyor, elle değiştirilemiyor (bkz. game/stages.ts).
 * Öncelik ve etiket not sayfasından değişiyor.
 *
 * Etikete göre gruplayınca birden çok etiketi olan not her sütununda çıkıyor,
 * Notion'daki çoklu seçim gibi.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PRIORITY_META, PRIORITY_ORDER } from '../components/properties/priority';
import { DatabaseHeader } from '../components/ui/DatabaseHeader';
import { FadeIn, staggerDelay } from '../components/ui/FadeIn';
import { Icon } from '../components/ui/Icon';
import { Tag } from '../components/ui/Tag';
import type { TodoCount } from '../db/repositories/blocks';
import { SEED_CATALOG } from '../game/config';
import {
  maturityProgress,
  resolveStage,
  STAGE_VISUALS,
  type VisualStage,
} from '../game/stages';
import { useHover } from '../hooks/useHover';
import type { BoardGroup, FieldTab } from '../navigation/views';
import { radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { Note, NoteTag, TagColor } from '../types';
import { formatDue, formatRelative } from '../utils/format';
import { FIELD_TABS } from './FarmView';

const STAGE_ORDER: VisualStage[] = ['planted', 'growing', 'harvestable', 'weedy'];
const COLUMN_WIDTH = 250;

const GROUP_OPTIONS: { key: BoardGroup; label: string }[] = [
  { key: 'stage', label: 'Aşama' },
  { key: 'priority', label: 'Öncelik' },
  { key: 'tag', label: 'Etiket' },
];

interface Column {
  key: string;
  label: string;
  color: TagColor;
  notes: Note[];
}

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  noteTags: Map<number, NoteTag[]>;
  allTags: NoteTag[];
  now: number;
  group: BoardGroup;
  onChangeGroup: (group: BoardGroup) => void;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd: () => void;
  onSelectTab: (tab: FieldTab) => void;
}

export function BoardView({
  notes,
  labor,
  noteTags,
  allTags,
  now,
  group,
  onChangeGroup,
  onOpen,
  onTend,
  onAdd,
  onSelectTab,
}: Props) {
  const styles = useStyles();
  const { stages } = useTheme();
  const [width, setWidth] = useState(0);

  const columns = buildColumns(group, notes, labor, noteTags, allTags, now, (stage) =>
    stages[stage].tag,
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View
        style={styles.column}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <DatabaseHeader
          icon="🌾"
          title="Tarla"
          description="Notlar sütunlarda. Aşama zamanla ve işler bittikçe kendiliğinden değişir."
          tabs={FIELD_TABS}
          activeTab="board"
          onSelectTab={onSelectTab}
          onNew={onAdd}
        />
        <GroupPicker value={group} onChange={onChangeGroup} />
      </View>

      {/* sütunlar ekrana sığmazsa yana kayıyor */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.board,
          { minWidth: width > 0 ? width : undefined },
        ]}
        style={styles.boardScroll}
      >
        {columns.map((column, index) => (
          <BoardColumn
            key={column.key}
            column={column}
            labor={labor}
            now={now}
            onOpen={onOpen}
            onTend={onTend}
            // yeni not ekilmiş başlıyor, aşama panosunda ilk sütun ona ait
            onAdd={group === 'stage' && index === 0 ? onAdd : undefined}
          />
        ))}
      </ScrollView>
    </ScrollView>
  );
}

function buildColumns(
  group: BoardGroup,
  notes: Note[],
  labor: Map<number, TodoCount>,
  noteTags: Map<number, NoteTag[]>,
  allTags: NoteTag[],
  now: number,
  stageColor: (stage: VisualStage) => TagColor,
): Column[] {
  if (group === 'priority') {
    return PRIORITY_ORDER.map((level) => ({
      key: `p${level}`,
      label: level === 0 ? 'Öncelik yok' : PRIORITY_META[level].label,
      color: PRIORITY_META[level].color,
      notes: notes.filter((note) => note.priority === level),
    }));
  }

  if (group === 'tag') {
    // sadece notu olan etiketler sütun oluyor, sonda etiketsizler
    const tagged = allTags
      .map((tag) => ({
        key: `t${tag.id}`,
        label: tag.name,
        color: tag.color,
        notes: notes.filter((note) =>
          (noteTags.get(note.id) ?? []).some((t) => t.id === tag.id),
        ),
      }))
      .filter((column) => column.notes.length > 0);
    const untagged: Column = {
      key: 'none',
      label: 'Etiketsiz',
      color: 'gray',
      notes: notes.filter((note) => !noteTags.has(note.id)),
    };
    return [...tagged, untagged];
  }

  return STAGE_ORDER.map((stage) => ({
    key: stage,
    label: STAGE_VISUALS[stage].label,
    color: stageColor(stage),
    notes: notes.filter(
      (note) => resolveStage(note, now, undefined, labor.get(note.id)) === stage,
    ),
  }));
}

// Sütunların üstündeki "Grupla" seçici
function GroupPicker({
  value,
  onChange,
}: {
  value: BoardGroup;
  onChange: (group: BoardGroup) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.groupRow}>
      <Icon name="layers" size={13} />
      <Text style={styles.groupLabel}>Grupla</Text>
      {GROUP_OPTIONS.map((option) => (
        <GroupOption
          key={option.key}
          label={option.label}
          active={option.key === value}
          onPress={() => onChange(option.key)}
        />
      ))}
    </View>
  );
}

function GroupOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[
        styles.groupOption,
        active ? styles.groupOptionActive : null,
        hovered && !active ? styles.hover : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} ile grupla`}
    >
      <Text style={[styles.groupText, active ? styles.groupTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BoardColumn({
  column,
  labor,
  now,
  onOpen,
  onTend,
  onAdd,
}: {
  column: Column;
  labor: Map<number, TodoCount>;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const add = useHover();
  const { notes } = column;
  return (
    <View style={styles.boardColumn}>
      <View style={styles.columnHead}>
        <Tag label={column.label} color={column.color} />
        <Text style={styles.count}>{notes.length}</Text>
      </View>
      {notes.map((note, index) => (
        <FadeIn key={note.id} delay={staggerDelay(index)} offset={4}>
          <BoardCard
            note={note}
            labor={labor.get(note.id)}
            now={now}
            onOpen={onOpen}
            onTend={onTend}
          />
        </FadeIn>
      ))}
      {onAdd ? (
        <Pressable
          onPress={onAdd}
          {...add.bind}
          style={[styles.addRow, add.hovered ? styles.hover : null]}
          accessibilityRole="button"
          accessibilityLabel="Yeni tohum ek"
        >
          <Icon name="plus" size={14} color={colors.textMuted} />
          <Text style={styles.addText}>Yeni</Text>
        </Pressable>
      ) : notes.length === 0 ? (
        <Text style={styles.emptyColumn}>Boş</Text>
      ) : null}
    </View>
  );
}

function BoardCard({
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
  const styles = useStyles();
  const { stages, colors } = useTheme();
  const { hovered, bind } = useHover();
  // aşama sütunu dışında da çubuğun rengi ve ot kuralı lazım
  const stage = resolveStage(note, now, undefined, labor);
  const progress = maturityProgress(note, now, undefined, labor);
  const weedy = stage === 'weedy';
  const due = note.due_at !== null ? formatDue(note.due_at, now) : null;
  return (
    <Pressable
      onPress={() => (weedy ? onTend(note.id) : onOpen(note.id))}
      {...bind}
      style={[styles.card, hovered ? styles.cardHover : null]}
      accessibilityRole="button"
      accessibilityLabel={
        weedy ? `${note.title} — ot bastı, temizlemek için dokun` : note.title
      }
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardEmoji}>{SEED_CATALOG[note.seed_type]?.emoji}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {note.title}
        </Text>
      </View>
      {note.content ? (
        <Text style={styles.preview} numberOfLines={2}>
          {note.content.replace(/\s+/g, ' ')}
        </Text>
      ) : null}
      <View style={styles.bar}>
        <View
          style={[styles.barFill, { flex: progress, backgroundColor: stages[stage].accent }]}
        />
        <View style={{ flex: 1 - progress }} />
      </View>
      <View style={styles.cardFoot}>
        {due ? (
          <View style={styles.labor}>
            <Icon
              name="calendar"
              size={12}
              color={due.tone === 'overdue' ? colors.danger : colors.textMuted}
            />
            <Text style={[styles.meta, due.tone === 'overdue' ? styles.overdue : null]}>
              {due.label}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>{formatRelative(note.created_at, now)}</Text>
        )}
        {labor && labor.total > 0 ? (
          <View style={styles.labor}>
            <Icon name="check-square" size={12} color={colors.textMuted} />
            <Text style={styles.meta}>
              {labor.done}/{labor.total}
            </Text>
          </View>
        ) : null}
        {weedy ? <Text style={styles.tend}>Temizle</Text> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2 },
  column: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  boardScroll: { alignSelf: 'center', width: '100%', maxWidth: 1100 },
  board: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.lg },
  boardColumn: { width: COLUMN_WIDTH, gap: spacing.sm },
  columnHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingBottom: spacing.xs,
  },
  count: { ...typography.caption, color: colors.textMuted },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  groupLabel: { ...typography.body, color: colors.textMuted, marginRight: spacing.xs },
  groupOption: {
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  groupOptionActive: { backgroundColor: colors.accentSoft },
  groupText: { ...typography.body, color: colors.textSecondary },
  groupTextActive: { color: colors.accent, fontWeight: '500' },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radii.sm,
    padding: spacing.sm + 2,
    gap: spacing.sm,
    ...elevation.card,
  },
  cardHover: { backgroundColor: colors.hover },
  cardHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardEmoji: { fontSize: 15, lineHeight: 20 },
  cardTitle: { ...typography.ui, color: colors.textPrimary, flex: 1 },
  preview: { ...typography.caption, color: colors.textMuted },
  bar: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.rule,
    overflow: 'hidden',
  },
  barFill: { height: 3 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted },
  overdue: { color: colors.danger },
  labor: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tend: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  hover: { backgroundColor: colors.hover },
  addText: { ...typography.body, color: colors.textMuted },
  emptyColumn: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
  },
}));
