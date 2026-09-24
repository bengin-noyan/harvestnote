// Kısa ipucu balonu. Otlu karta dokununca notun neden açılmadığını
// söylüyor. Sessizce reddedince kullanıcı bug sanıyordu.
import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { radii, spacing, typography } from '../theme';
import { durations, easings } from '../theme/motion';
import { makeStyles } from '../theme/ThemeProvider';

interface Props {
  message: string | null;
  onHide: () => void;
  durationMs?: number;
}

export function HintToast({ message, onHide, durationMs = 2200 }: Props) {
  const styles = useStyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!message) {
      progress.value = withTiming(0, {
        duration: durations.fast,
        easing: easings.in,
      });
      return;
    }
    // withSequence sart. Iki ayri atama yapinca ikincisi birincisini aninda
    // iptal ediyor ve balon hic gorunmuyor.
    progress.value = withSequence(
      withTiming(1, { duration: durations.base, easing: easings.out }),
      withDelay(
        durationMs,
        withTiming(0, { duration: durations.base, easing: easings.in }, (finished) => {
          if (finished) runOnJS(onHide)();
        }),
      ),
    );
  }, [message, durationMs, progress, onHide]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  if (!message) return null;

  return (
    <Animated.View style={[styles.toast, styles.noHit, style]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  noHit: { pointerEvents: 'none' },
  // Koyu gri balon, açık zeminde daha iyi seçiliyor.
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    alignSelf: 'center',
    maxWidth: 420,
    backgroundColor: colors.toast,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    ...elevation.overlay,
  },
  text: {
    ...typography.body,
    color: colors.onToast,
    textAlign: 'center',
  },
}));
