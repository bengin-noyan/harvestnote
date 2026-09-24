// Tarlanın en sonundaki "Yeni tohum" kartı.
// Önceden bir sıra boş parsel vardı, çok kalabalık duruyordu. Tek karta indirdim.
import React from 'react';
import { Pressable, Text } from 'react-native';

import { useHover } from '../hooks/useHover';
import { DENSE_FONT_SCALE_CAP, radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { Icon } from './ui/Icon';

interface Props {
  size: number;
  onPress: () => void;
}

export function EmptyPlot({ size, onPress }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();

  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={({ pressed }) => [
        styles.card,
        { width: size, height: size },
        hovered || pressed ? styles.cardHover : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Yeni tohum ek"
    >
      <Icon name="plus" size={20} color={hovered ? colors.textSecondary : colors.textMuted} />
      <Text style={styles.label} maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}>
        Yeni tohum
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ruleStrong,
  },
  cardHover: { backgroundColor: colors.hover },
  label: { ...typography.caption, color: colors.textMuted },
}));
