// Notun etiketleri. Etikete basınca çıkıyor, kutuya yazıp Enter'a basınca
// ekleniyor. Yazarken var olan etiketler öneri olarak altta çıkıyor.
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { TAG_NAME_MAX } from '../../db/repositories/tags';
import { useHover } from '../../hooks/useHover';
import { borders, radii, spacing, typography } from '../../theme';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import type { NoteTag } from '../../types';
import { Icon } from '../ui/Icon';

// Öneri listesi uzamasın
const MAX_SUGGESTIONS = 6;

interface Props {
  tags: NoteTag[];
  allTags: NoteTag[];
  onAdd: (name: string) => void;
  onRemove: (tagId: number) => void;
}

export function TagEditor({ tags, allTags, onAdd, onRemove }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const term = text.trim().toLocaleLowerCase('tr');
  const own = new Set(tags.map((tag) => tag.id));
  const suggestions = allTags
    .filter((tag) => !own.has(tag.id))
    .filter((tag) => !term || tag.name.toLocaleLowerCase('tr').includes(term))
    .slice(0, MAX_SUGGESTIONS);
  const exact = allTags.some((tag) => tag.name.toLocaleLowerCase('tr') === term);

  const add = (name: string) => {
    if (!name.trim()) return;
    onAdd(name);
    setText('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.chips}>
        {tags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => onRemove(tag.id)} />
        ))}
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          // öneriye basınca blur önce geliyor, liste kapanmasın diye biraz bekliyoruz
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onSubmitEditing={() => add(text)}
          blurOnSubmit={false}
          placeholder={tags.length ? 'Ekle…' : 'Etiket ekle…'}
          placeholderTextColor={colors.textMuted}
          maxLength={TAG_NAME_MAX}
          style={styles.input}
          accessibilityLabel="Etiket ekle"
        />
      </View>

      {focused && (suggestions.length > 0 || (term && !exact)) ? (
        <View style={styles.panel}>
          {suggestions.map((tag) => (
            <Suggestion key={tag.id} onPress={() => add(tag.name)}>
              <TagChip tag={tag} />
            </Suggestion>
          ))}
          {term && !exact ? (
            <Suggestion onPress={() => add(text)}>
              <Text style={styles.createText}>
                Oluştur: <Text style={styles.createName}>{text.trim()}</Text>
              </Text>
            </Suggestion>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// Tek etiket. onRemove verilirse yanında küçük bir × çıkıyor.
export function TagChip({ tag, onRemove }: { tag: NoteTag; onRemove?: () => void }) {
  const styles = useStyles();
  const { tags } = useTheme();
  const palette = tags[tag.color];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.chipText, { color: palette.text }]} numberOfLines={1}>
        {tag.name}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${tag.name} etiketini kaldır`}
        >
          <Icon name="x" size={12} color={palette.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Suggestion({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={({ pressed }) => [styles.suggestion, hovered || pressed ? styles.hover : null]}
      accessibilityRole="button"
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  root: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: 200,
  },
  chipText: { ...typography.body, flexShrink: 1 },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    minWidth: 90,
    flexGrow: 1,
    paddingVertical: 0,
    outlineWidth: 0,
  },
  panel: {
    alignSelf: 'flex-start',
    minWidth: 220,
    backgroundColor: colors.popover,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    padding: spacing.xs,
    marginTop: spacing.xs,
    ...elevation.popover,
  },
  suggestion: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.xs,
  },
  hover: { backgroundColor: colors.hover },
  createText: { ...typography.body, color: colors.textSecondary },
  createName: { color: colors.textPrimary, fontWeight: '600' },
}));
