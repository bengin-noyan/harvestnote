// Renkli etiket. Aşama ve kalite etiketleri bunu kullanıyor.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radii, typography, type TagColor } from '../../theme';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';

interface Props {
  label: string;
  color: TagColor;
}

export function Tag({ label, color }: Props) {
  const { tags } = useTheme();
  const styles = useStyles();
  const palette = tags[color];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  text: { ...typography.body },
}));
