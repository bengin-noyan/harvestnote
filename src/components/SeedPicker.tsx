// Yatay tohum seçici. Seçilen tür olgunlaşma süresini de belirliyor
// (bkz. SEED_CATALOG), yani sadece görsel bir tercih değil.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { maturityDurationFor, SEED_CATALOG, SEED_ORDER } from '../game/config';
import { borders, radii, spacing, typography } from '../theme';
import type { SeedType } from '../types';
import { formatDuration } from '../utils/format';
import { makeStyles } from '../theme/ThemeProvider';

interface Props {
  value: SeedType;
  onChange: (seed: SeedType) => void;
}

export function SeedPicker({ value, onChange }: Props) {
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {SEED_ORDER.map((type) => {
        const seed = SEED_CATALOG[type];
        const selected = type === value;

        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${seed.label}, ${seed.hint}`}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={styles.emoji}>{seed.emoji}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {seed.label}
            </Text>
            <Text style={styles.hint} numberOfLines={1}>
              {seed.hint}
            </Text>
            <View style={styles.durationRow}>
              <Text style={styles.duration}>
                ⏳ {formatDuration(maturityDurationFor(type))}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  // Seçili tohum mavi çerçeveyle belli oluyor.
  chip: {
    width: 108,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderWidth: borders.width,
    borderColor: 'transparent',
    borderRadius: radii.sm,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  emoji: { fontSize: 30 },
  label: { ...typography.ui, color: colors.textSecondary },
  labelSelected: { color: colors.textPrimary },
  hint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  durationRow: { marginTop: spacing.xs },
  duration: { ...typography.caption, fontSize: 10, color: colors.textPrimary },
}));
