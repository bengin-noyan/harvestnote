// Uygulamadaki standart buton.
// İsmi eski pixel-art tasarımdan kaldı, artık düz bir buton. Basınca biraz küçülüyor.
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useHover } from '../hooks/useHover';
import { borders, radii, spacing, typography, type ThemeColors } from '../theme';
import { springs } from '../theme/motion';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

export type PixelButtonTone = 'primary' | 'soil' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  tone?: PixelButtonTone;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function tonesFor(
  colors: ThemeColors,
): Record<PixelButtonTone, { bg: string; hover: string; border: string; text: string }> {
  return {
  primary: {
    bg: colors.accent,
    hover: colors.accentPressed,
    border: colors.accent,
    text: colors.onAccent,
  },
  soil: {
    bg: colors.surfaceSunken,
    hover: colors.hover,
    border: colors.rule,
    text: colors.textPrimary,
  },
  ghost: {
    bg: 'transparent',
    hover: colors.hover,
    border: colors.ruleStrong,
    text: colors.textSecondary,
  },
  danger: {
    bg: colors.surface,
    hover: colors.dangerSoft,
    border: colors.danger,
    text: colors.danger,
  },
  };
}

export function PixelButton({
  label,
  onPress,
  tone = 'primary',
  icon,
  disabled = false,
  style,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const palette = tonesFor(colors)[tone];
  const { hovered, bind } = useHover();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        {...bind}
        onPressIn={() => {
          scale.value = withSpring(0.96, springs.settle);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springs.enter);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.base,
          {
            backgroundColor: hovered && !disabled ? palette.hover : palette.bg,
            borderColor: palette.border,
          },
          disabled && styles.disabled,
        ]}
      >
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  base: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    borderWidth: borders.width,
    borderRadius: radii.xs,
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 14, lineHeight: 20 },
  label: { ...typography.ui },
  disabled: { opacity: 0.45 },
}));
