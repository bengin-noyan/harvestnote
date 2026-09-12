/**
 * Alttan açılan panel. Ekstra kütüphane kurmamak için RN `Modal` + Reanimated
 * ile kuruldu; tutamağından aşağı sürüklenerek kapatılabiliyor.
 *
 * Not: Android'de RN Modal ayrı bir view hiyerarşisine render edildiği için
 * içindeki jestlerin çalışması adına içerik kendi `GestureHandlerRootView`'i
 * ile sarmalanmak zorunda.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { borders, colors, elevation, radii, spacing, typography } from '../theme';
import { durations, easings, springs } from '../theme/motion';

const DISMISS_DISTANCE = 90;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: Props) {
  // Kapanış animasyonunun oynayabilmesi için Modal, `visible` false olduktan
  // sonra da kısa süre monte kalır.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.value = 0;
      progress.value = withTiming(1, {
        duration: durations.slow,
        easing: easings.out,
      });
      return;
    }
    progress.value = withTiming(0, {
      duration: durations.base,
      easing: easings.in,
    }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, progress, dragY]);

  const close = useCallback(() => onClose(), [onClose]);

  const dragGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > 900) {
        runOnJS(close)();
      } else {
        dragY.value = withSpring(0, springs.settle);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.6,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - progress.value) * 480 + dragY.value },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel="Paneli kapat"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
        >
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <GestureDetector gesture={dragGesture}>
              <View style={styles.header}>
                <View style={styles.handle} />
                <Text style={styles.title}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
              </View>
            </GestureDetector>

            <View style={styles.body}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.bark },
  // box-none: panelin disindaki bosluk arkadaki backdrop'a tiklamayi gecirmeli.
  avoider: { justifyContent: 'flex-end', pointerEvents: 'box-none' },
  /**
   * Panel artık kendi kenarlığıyla değil, gölgesi ve köşesiyle kağıttan
   * ayrılıyor: altındaki ekran zaten aydınlık, kalın çerçeve onu kutuya
   * çeviriyordu.
   */
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    ...elevation.overlay,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.ruleStrong,
    marginBottom: spacing.sm,
  },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
});
