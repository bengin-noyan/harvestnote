// Arayüzdeki simgeler için Feather setini kullanıyorum.
// Notların kendi simgesi (🥕, 🌾) emoji olarak kaldı.
import Feather from '@expo/vector-icons/Feather';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';

export type IconName = React.ComponentProps<typeof Feather>['name'];

interface Props {
  name: IconName;
  size?: number;
  // verilmezse gri
  color?: string;
}

export function Icon({ name, size = 16, color }: Props) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.textMuted} />;
}
