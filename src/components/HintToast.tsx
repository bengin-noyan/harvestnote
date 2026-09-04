/**
 * Kısa ipucu balonu. Ot basmış karta dokunulduğunda "neden açılmadığını"
 * anlatmak için kullanılıyor — sessizce reddetmek kullanıcıyı yanıltıyordu.
 */
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

import { borders, colors, elevation, radii, spacing, typography } from '../theme';
import { durations, easings } from '../theme/motion';

interface Props {
  message: string | null;
  onHide: () => void;
  durationMs?: number;
}

export function HintToast({ message, onHide, durationMs = 2200 }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!message) {
      progress.value = withTiming(0, {
        duration: durations.fast,
        easing: easings.in,
      });
      return;
    }
    // Tek bir dizi olarak kurulmali: iki ayri atama yapilirsa ikincisi
    // birincisini aninda iptal eder ve balon hic gorunmez.
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

const styles = StyleSheet.create({
  noHit: { pointerEvents: 'none' },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.soilDeep,
    borderWidth: borders.width,
    borderColor: colors.soilLight,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    ...elevation.overlay,
  },
  text: {
    ...typography.body,
    color: colors.textOnDark,
    textAlign: 'center',
  },
});
