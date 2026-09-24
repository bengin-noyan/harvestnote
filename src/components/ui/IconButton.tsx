// Üst çubuk ve kenar çubuğundaki küçük simge düğmeleri.
import React from 'react';
import { Pressable } from 'react-native';

import { useHover } from '../../hooks/useHover';
import { radii } from '../../theme';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  label: string;
  onPress: () => void;
  // kenar çubuğunda hover rengi biraz farklı
  onSidebar?: boolean;
  // simgenin rengi, ör. favorideki sarı yıldız
  color?: string;
  size?: number;
}

export function IconButton({
  icon,
  label,
  onPress,
  onSidebar = false,
  color,
  size = 16,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        hovered || pressed
          ? { backgroundColor: onSidebar ? colors.selected : colors.hover }
          : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon
        name={icon}
        size={size}
        color={color ?? (hovered ? colors.textSecondary : colors.textMuted)}
      />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  button: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
