// Ana sayfa ve Yaklaşanlar'da kullandığım not satırı.
// Otlu nota basınca açılmıyor, temizleniyor. Kartta da tabloda da böyle.
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { TodoCount } from '../db/repositories/blocks';
import { SEED_CATALOG } from '../game/config';
import { resolveStage, STAGE_VISUALS } from '../game/stages';
import { useHover } from '../hooks/useHover';
import { radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { Note } from '../types';
import { Tag } from './ui/Tag';

interface Props {
  note: Note;
  labor?: TodoCount;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  // sağdaki gri yazı, ör. "3 saat sonra ot basar"
  meta?: string;
  // sağdaki küçük düğme (Temizle, Hasat et)
  action?: { label: string; onPress: () => void };
  showStage?: boolean;
}

export function NoteRow({
  note,
  labor,
  now,
  onOpen,
  onTend,
  meta,
  action,
  showStage = true,
}: Props) {
  const styles = useStyles();
  const { stages } = useTheme();
  const row = useHover();
  const button = useHover();
  const stage = resolveStage(note, now, undefined, labor);
  const visual = STAGE_VISUALS[stage];
  const weedy = stage === 'weedy';

  return (
    <View style={[styles.row, row.hovered || button.hovered ? styles.hover : null]}>
      <Pressable
        onPress={() => (weedy ? onTend(note.id) : onOpen(note.id))}
        {...row.bind}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={
          weedy ? `${note.title} — ot bastı, temizlemek için dokun` : note.title
        }
      >
        <Text style={styles.emoji}>{SEED_CATALOG[note.seed_type]?.emoji ?? '🌾'}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {note.title}
        </Text>
        {/* Tag'i View'a sarmayınca satırda yukarıda kalıyordu */}
        {showStage ? (
          <View>
            <Tag label={visual.label} color={stages[stage].tag} />
          </View>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </Pressable>
      {/* iç içe button olmasın diye düğmeyi dışarı aldım */}
      {action ? (
        <Pressable
          onPress={action.onPress}
          {...button.bind}
          style={[styles.action, button.hovered ? styles.actionHover : null]}
          accessibilityRole="button"
          accessibilityLabel={`${note.title}: ${action.label}`}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 38,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  hover: { backgroundColor: colors.hover },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    minWidth: 0,
  },
  emoji: { fontSize: 16, lineHeight: 20 },
  title: { ...typography.ui, color: colors.textPrimary, flexShrink: 1 },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  action: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  actionHover: { backgroundColor: colors.hover },
  actionText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
}));
