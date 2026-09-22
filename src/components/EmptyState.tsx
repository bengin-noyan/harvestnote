// Boş liste ekranı. Tarla, liste ve kiler aynı bileşeni kullanıyor.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { PixelButton } from './PixelButton';

interface Props {
  emoji: string;
  title: string;
  message: string;
  onDark?: boolean;
  /**
   * Boş ekranda bir çıkış yolu olsun istedim. Sadece "tarla boş" yazınca
   * kullanıcı ekme düğmesini kenar çubuğunda aramak zorunda kalıyor.
   * İkisi birden verilmezse düğme çizilmiyor.
   */
  actionLabel?: string;
  onAction?: () => void;
}

/** onDark sadece toprak zeminlerde lazım, kabuk artık açık renk. */
export function EmptyState({
  emoji,
  title,
  message,
  onDark = false,
  actionLabel,
  onAction,
}: Props) {
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
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PixelButton label={actionLabel} icon="🌱" onPress={onAction} />
        </View>
      ) : null}
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
  action: { marginTop: spacing.md },
});
