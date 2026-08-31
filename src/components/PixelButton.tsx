/**
 * Temel buton. Pixel-art hissi için keskin köşe, kalın kenarlık ve basınca
 * "içeri gömülme" (offset gölgenin kaybolması) efekti.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { borders, colors, radii, spacing, typography } from '../theme';

export type PixelButtonTone = 'primary' | 'soil' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  tone?: PixelButtonTone;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<
  PixelButtonTone,
  { bg: string; border: string; text: string }
> = {
  primary: { bg: colors.leaf, border: colors.grass, text: colors.bark },
  soil: { bg: colors.soilLight, border: colors.soilDeep, text: colors.textOnDark },
  ghost: { bg: 'transparent', border: colors.soilLight, text: colors.textOnDark },
  danger: { bg: colors.danger, border: '#7d2f1e', text: colors.parchment },
};

export function PixelButton({
  label,
  onPress,
  tone = 'primary',
  icon,
  disabled = false,
  style,
}: Props) {
  const palette = TONES[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          // Basınca gölge kadar aşağı kayar: tuşa basılmış hissi.
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.shadow,
              { backgroundColor: palette.border },
              pressed && styles.shadowPressed,
            ]}
          />
          <View style={styles.row}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: borders.thick,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    position: 'absolute',
    left: -borders.thick,
    right: -borders.thick,
    bottom: -6,
    height: 6,
    borderBottomLeftRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
  },
  shadowPressed: { opacity: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  icon: { fontSize: 15 },
  label: { ...typography.heading },
  disabled: { opacity: 0.45 },
});
