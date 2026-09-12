/** Boş liste durumu — tarla ve kiler için ortak. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

interface Props {
  emoji: string;
  title: string;
  message: string;
  onDark?: boolean;
}

/** `onDark` yalnızca toprak yüzeylerde gerekir; kabuk artık aydınlık. */
export function EmptyState({ emoji, title, message, onDark = false }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[styles.title, { color: onDark ? colors.textOnDark : colors.textPrimary }]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.message,
          { color: onDark ? colors.textOnDarkMuted : colors.textMuted },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emoji: { fontSize: 52 },
  title: { ...typography.title },
  message: { ...typography.body, textAlign: 'center', lineHeight: 20 },
});
