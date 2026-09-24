// Ekrana gelen şeyler hafifçe belirip yukarı kayıyor.
// Reanimated'in entering animasyonu web'de bazen çalışmadığı için elle yaptım.
// Cihazda hareket azaltma açıksa animasyon yok.
import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { durations, easings } from '../../theme/motion';

interface Props {
  children: React.ReactNode;
  // listelerde sırayla gelsinler diye
  delay?: number;
  // kaç piksel aşağıdan başlasın
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeIn({ children, delay = 0, offset = 6, style }: Props) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: durations.slow, easing: easings.out }),
    );
  }, [delay, reduced, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * offset }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// Sıradaki satırın gecikmesi. 12'den sonra artmıyor, uzun listede çok beklemesin.
export function staggerDelay(index: number): number {
  return Math.min(index, 12) * 28;
}
