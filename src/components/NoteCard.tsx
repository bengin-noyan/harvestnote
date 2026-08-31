/**
 * Tarladaki tek bir toprak hücresi.
 *
 * Jest haritası (aşamaya göre değişir):
 *   weedy        yana kaydır  -> otlar süzülüp gider, `tendNote` çalışır
 *                dokunma      -> AÇILMAZ; kart sallanır ve ipucu gösterilir
 *   harvestable  yukarı kaydır / uzun bas -> ürün küçülüp kaybolur, hasat
 *                dokunma      -> detay
 *   diğer        dokunma      -> detay
 *
 * Aşamaların tamamı `resolveStage` ile türetilir; kart hiçbir zaman kendi
 * başına durum uydurmaz.
 */
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SEED_CATALOG } from '../game/config';
import {
  maturityProgress,
  resolveStage,
  stageEmoji,
  STAGE_VISUALS,
} from '../game/stages';
import { borders, colors, radii, spacing, typography } from '../theme';
import type { Note } from '../types';

/** Otların temizlenmiş sayılması için gereken yatay mesafe. */
const CLEAR_DISTANCE = 88;
/** Hasat için gereken yukarı kaydırma mesafesi. */
const HARVEST_DISTANCE = 64;

interface Props {
  note: Note;
  /** Ekranın paylaşılan saati — bkz. hooks/useNow. */
  now: number;
  size: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onHarvest: (id: number) => void;
  /** Ot basmış karta dokunulduğunda: ipucu göster. */
  onBlocked: () => void;
}

function NoteCardComponent({
  note,
  now,
  size,
  onOpen,
  onTend,
  onHarvest,
  onBlocked,
}: Props) {
  const stage = resolveStage(note, now);
  const visual = STAGE_VISUALS[stage];
  const isWeedy = stage === 'weedy';
  const isHarvestable = stage === 'harvestable';
  const progress = maturityProgress(note, now);
  const seed = SEED_CATALOG[note.seed_type];

  const weedX = useSharedValue(0);
  const weedOpacity = useSharedValue(isWeedy ? 1 : 0);
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(1);
  const liftY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const glow = useSharedValue(0);

  // Ekildiğinde tek seferlik "filizlenme" sıçraması.
  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 13, stiffness: 170 });
  }, [cardScale]);

  // Aşama dışarıdan değişebilir (time-skip, ot temizleme): katmanları eşitle.
  useEffect(() => {
    weedOpacity.value = withTiming(isWeedy ? 1 : 0, { duration: 220 });
    if (!isWeedy) weedX.value = 0;
  }, [isWeedy, weedOpacity, weedX]);

  // Olgun ürün nefes alır gibi parlar.
  useEffect(() => {
    if (isHarvestable) {
      glow.value = 0.35;
      glow.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(glow);
  }, [isHarvestable, glow]);

  const handleTend = useCallback(() => onTend(note.id), [onTend, note.id]);
  const handleHarvest = useCallback(
    () => onHarvest(note.id),
    [onHarvest, note.id],
  );
  const handleOpen = useCallback(() => onOpen(note.id), [onOpen, note.id]);

  /**
   * Hasat animasyonu: küt bir "pop", ardından scale 0'a küçülme.
   * UI thread'inde çalışan bir worklet — jest geri çağrılarından doğrudan
   * çağrılabilsin diye useCallback'e sarılmadı.
   */
  const playHarvest = () => {
    'worklet';
    liftY.value = withTiming(-52, { duration: 280 });
    cardScale.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withTiming(0, { duration: 220 }),
    );
    cardOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) runOnJS(handleHarvest)();
    });
  };

  /* --- Jestler -------------------------------------------------------- */

  const clearGesture = Gesture.Pan()
    .enabled(isWeedy)
    .activeOffsetX([-14, 14])
    .failOffsetY([-28, 28])
    .onUpdate((event) => {
      weedX.value = event.translationX;
      // Otlar kaydırma ilerledikçe soluklaşır: geri bildirim anlık.
      weedOpacity.value = Math.max(
        0,
        1 - Math.abs(event.translationX) / CLEAR_DISTANCE,
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) < CLEAR_DISTANCE) {
        weedX.value = withSpring(0, { damping: 16 });
        weedOpacity.value = withTiming(1, { duration: 180 });
        return;
      }
      const direction = event.translationX > 0 ? 1 : -1;
      weedX.value = withTiming(direction * 280, { duration: 240 });
      weedOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(handleTend)();
      });
      cardScale.value = withSequence(
        withTiming(1.07, { duration: 130 }),
        withSpring(1, { damping: 12 }),
      );
    });

  const harvestGesture = Gesture.Pan()
    .enabled(isHarvestable)
    .activeOffsetY([-14, 14])
    .failOffsetX([-28, 28])
    .onUpdate((event) => {
      const lift = Math.min(0, event.translationY);
      liftY.value = lift;
      cardScale.value = 1 + Math.min(60, -lift) / 500;
    })
    .onEnd((event) => {
      if (event.translationY <= -HARVEST_DISTANCE) {
        playHarvest();
        return;
      }
      liftY.value = withSpring(0, { damping: 16 });
      cardScale.value = withSpring(1, { damping: 16 });
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(isHarvestable)
    .minDuration(420)
    .onStart(() => {
      playHarvest();
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd((_event, success) => {
      if (!success) return;
      if (isWeedy) {
        // Ot basmış not açılmaz: reddedişi animasyonla anlat.
        shakeX.value = withSequence(
          withTiming(-7, { duration: 55 }),
          withTiming(7, { duration: 55 }),
          withTiming(-4, { duration: 55 }),
          withTiming(0, { duration: 55 }),
        );
        runOnJS(onBlocked)();
        return;
      }
      runOnJS(handleOpen)();
    });

  const gesture = Gesture.Race(
    clearGesture,
    harvestGesture,
    Gesture.Exclusive(longPressGesture, tapGesture),
  );

  /* --- Animasyonlu stiller -------------------------------------------- */

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: shakeX.value },
      { translateY: liftY.value },
      { scale: cardScale.value },
    ],
  }));

  const weedStyle = useAnimatedStyle(() => ({
    opacity: weedOpacity.value,
    transform: [
      { translateX: weedX.value },
      { rotate: `${weedX.value / 26}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.wrapper, { width: size, height: size }, cardStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${note.title}, ${visual.label}`}
        accessibilityHint={visual.hint}
      >
        <View
          style={[
            styles.tile,
            { backgroundColor: visual.tile, borderColor: visual.border },
          ]}
        >
          {/* Toprak çizgileri */}
          <View style={[styles.furrows, styles.noHit]}>
            <View style={styles.furrow} />
            <View style={styles.furrow} />
            <View style={styles.furrow} />
          </View>

          <Animated.View
            style={[styles.glowRing, styles.noHit, glowStyle]}
          />

          <Text style={styles.emoji}>{stageEmoji(stage, note.seed_type)}</Text>

          <Text style={styles.title} numberOfLines={2}>
            {note.title}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.stageLabel} numberOfLines={1}>
              {seed?.emoji ?? ''} {visual.label}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={{
                  flex: progress,
                  backgroundColor: isHarvestable
                    ? colors.goldLight
                    : colors.leaf,
                }}
              />
              <View style={{ flex: 1 - progress }} />
            </View>
          </View>

          {isHarvestable ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>↑ hasat</Text>
            </View>
          ) : null}

          {/* Ot katmanı: kaydırıldıkça kayar ve solar */}
          <Animated.View
            style={[
              styles.weedLayer,
              weedStyle,
              { pointerEvents: isWeedy ? 'auto' : 'none' },
            ]}
          >
            <View style={styles.weedRow}>
              <Text style={styles.weedEmoji}>🥀</Text>
              <Text style={styles.weedEmojiSmall}>🌿</Text>
              <Text style={styles.weedEmoji}>🥀</Text>
            </View>
            <Text style={styles.weedTitle} numberOfLines={1}>
              {note.title}
            </Text>
            <View style={styles.weedHint}>
              <Text style={styles.weedHintText}>↔ temizle</Text>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export const NoteCard = React.memo(NoteCardComponent);

const styles = StyleSheet.create({
  wrapper: { padding: spacing.xs },
  /** Dekoratif katmanlar jestleri yakalamamali. */
  noHit: { pointerEvents: 'none' },
  tile: {
    flex: 1,
    borderWidth: borders.thick,
    borderRadius: radii.md,
    padding: spacing.sm,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  furrows: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-evenly',
    opacity: 0.35,
  },
  furrow: { height: 1, backgroundColor: colors.furrow },
  glowRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: borders.thick,
    borderRadius: radii.sm,
    borderColor: colors.goldLight,
  },
  emoji: { fontSize: 40, textAlign: 'center', marginTop: spacing.xs },
  title: {
    ...typography.body,
    color: colors.textOnDark,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: { gap: spacing.xs },
  stageLabel: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
  },
  progressTrack: {
    flexDirection: 'row',
    height: 5,
    backgroundColor: colors.soilDeep,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs + 1,
    paddingVertical: 1,
  },
  badgeText: { ...typography.caption, fontSize: 9, color: colors.bark },
  weedLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.weedDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  weedRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  weedEmoji: { fontSize: 30 },
  weedEmojiSmall: { fontSize: 22, opacity: 0.8 },
  weedTitle: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
  },
  weedHint: {
    borderWidth: 1,
    borderColor: colors.weed,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  weedHintText: { ...typography.caption, fontSize: 10, color: colors.leafLight },
});
