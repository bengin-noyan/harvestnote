/**
 * Pano görünümü. Her aşama bir sütun, notlar da o sütunlarda.
 *
 * Kartları sürükleyip başka sütuna taşıma yok. Aşama zamana ve bitirilen
 * işlere göre hesaplanıyor, elle değiştirilemiyor (bkz. game/stages.ts).
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
import type { FieldTab } from '../navigation/views';
import { radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { Note } from '../types';
import { formatRelative } from '../utils/format';
import { FIELD_TABS } from './FarmView';

const COLUMNS: VisualStage[] = ['planted', 'growing', 'harvestable', 'weedy'];
const COLUMN_WIDTH = 250;

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd: () => void;
  onSelectTab: (tab: FieldTab) => void;
}

export function BoardView({ notes, labor, now, onOpen, onTend, onAdd, onSelectTab }: Props) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);

  const grouped: Record<VisualStage, Note[]> = {
    planted: [],
    growing: [],
    harvestable: [],
    weedy: [],
  };
  for (const note of notes) {
    grouped[resolveStage(note, now, undefined, labor.get(note.id))].push(note);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View
        style={styles.column}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <DatabaseHeader
          icon="🌾"
          title="Tarla"
          description="Notlar aşamalarına göre sütunlarda. Aşama zamanla ve işler bittikçe kendiliğinden değişir."
          tabs={FIELD_TABS}
          activeTab="board"
          onSelectTab={onSelectTab}
          onNew={onAdd}
        />
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
        {COLUMNS.map((stage) => (
          <BoardColumn
            key={stage}
            stage={stage}
            notes={grouped[stage]}
            labor={labor}
            now={now}
            onOpen={onOpen}
            onTend={onTend}
            onAdd={stage === 'planted' ? onAdd : undefined}
          />
        ))}
      </ScrollView>
    </ScrollView>
  );
}

function BoardColumn({
  stage,
  notes,
  labor,
  now,
  onOpen,
  onTend,
  onAdd,
}: {
  stage: VisualStage;
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd?: () => void;
}) {
  const styles = useStyles();
  const { stages, colors } = useTheme();
  const add = useHover();
  const visual = STAGE_VISUALS[stage];
  return (
    <View style={styles.boardColumn}>
      <View style={styles.columnHead}>
        <Tag label={visual.label} color={stages[stage].tag} />
        <Text style={styles.count}>{notes.length}</Text>
      </View>
      {notes.map((note, index) => (
        <FadeIn key={note.id} delay={staggerDelay(index)} offset={4}>
          <BoardCard
            note={note}
            labor={labor.get(note.id)}
            now={now}
            stage={stage}
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
  stage,
  onOpen,
  onTend,
}: {
  note: Note;
  labor?: TodoCount;
  now: number;
  stage: VisualStage;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
}) {
  const styles = useStyles();
  const { stages, colors } = useTheme();
  const { hovered, bind } = useHover();
  const progress = maturityProgress(note, now, undefined, labor);
  const weedy = stage === 'weedy';
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
        <Text style={styles.meta}>{formatRelative(note.created_at, now)}</Text>
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
