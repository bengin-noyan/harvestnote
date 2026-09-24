/**
 * Tarladaki not kartı.
 *
 * Üstte aşamanın renginde bir kapak var, bitki orada büyüyor. Olgunluğu ayrı
 * bir çubukla göstermedim, bitkinin boyu zaten gösteriyor (bkz. LivingPlant).
 *
 * Jestler aşamaya göre değişiyor:
 *   weedy        yana kaydır  -> otlar kayıp gidiyor, tendNote çalışıyor
 *                dokunma      -> AÇILMIYOR, parsel sallanıp ipucu çıkıyor
 *   harvestable  yukarı kaydır / uzun bas -> ürün küçülüp kayboluyor, hasat
 *                dokunma      -> detay
 *   diğer        dokunma      -> detay
 *
 * Aşamaların hepsi resolveStage'den geliyor, parsel kendi kafasına göre durum
 * uydurmuyor.
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

import type { TodoCount } from '../db/repositories/blocks';
import { SEED_CATALOG } from '../game/config';
import {
  maturityProgress,
  resolveStage,
  STAGE_VISUALS,
} from '../game/stages';
import { DENSE_FONT_SCALE_CAP, radii, spacing, typography } from '../theme';
import { durations, easings, springs } from '../theme/motion';
import type { Note } from '../types';
import { LivingPlant } from './LivingPlant';
import { Icon } from './ui/Icon';
import { Tag } from './ui/Tag';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

/** Otların temizlenmiş sayılması için gereken yatay mesafe. */
const CLEAR_DISTANCE = 88;
/** Hasat için gereken yukarı kaydırma mesafesi. */
const HARVEST_DISTANCE = 64;

// Kapak kartın ne kadarını kaplasın, kalan yer başlık için.
const COVER_RATIO = 0.6;
// Bitkinin kutusu kapağın %80'i. Kutu sabit, içindeki bitki büyüyor.
const PLANT_BOX_RATIO = 0.8;

interface Props {
  note: Note;
  /** Ekranın ortak saati, bkz. hooks/useNow. */
  now: number;
  /** Notun yapılacak sayımı. Yoksa olgunluk sadece zamandan geliyor. */
  labor?: TodoCount;
  size: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onHarvest: (id: number) => void;
  /** Otlu parsele dokununca ipucu göstermek için. */
  onBlocked: () => void;
}

function NoteCardComponent({
  note,
  now,
  labor,
  size,
  onOpen,
  onTend,
  onHarvest,
  onBlocked,
}: Props) {
  const styles = useStyles();
  const stage = resolveStage(note, now, undefined, labor);
  const visual = STAGE_VISUALS[stage];
  const isWeedy = stage === 'weedy';
  const isHarvestable = stage === 'harvestable';
  const progress = maturityProgress(note, now, undefined, labor);
  const seed = SEED_CATALOG[note.seed_type];

  const { stages, colors } = useTheme();
  const cover = Math.round(size * COVER_RATIO);
  const plantBox = Math.round(cover * PLANT_BOX_RATIO);
  const glowSize = Math.round(size * 0.55);
  const moundHeight = Math.max(6, Math.round(size * 0.05));

  const weedX = useSharedValue(0);
  const weedOpacity = useSharedValue(isWeedy ? 1 : 0);
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(1);
  const liftY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const glow = useSharedValue(0);

  // Ekildiğinde tek seferlik "filizlenme" sıçraması.
  useEffect(() => {
    cardScale.value = withSpring(1, springs.enter);
  }, [cardScale]);

  // Aşama dışarıdan da değişebiliyor (time-skip, ot temizleme), katmanları
  // ona göre eşitliyoruz.
  useEffect(() => {
    weedOpacity.value = withTiming(isWeedy ? 1 : 0, {
      duration: durations.base,
      easing: easings.out,
    });
    if (!isWeedy) weedX.value = 0;
  }, [isWeedy, weedOpacity, weedX]);

  // Olgun ürünün altındaki toprak nefes alır gibi parlıyor.
  useEffect(() => {
    if (isHarvestable) {
      glow.value = 0.35;
      glow.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: durations.base });
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
   * Hasat animasyonu: kısa bir "pop", sonra scale 0'a küçülme.
   * UI thread'inde çalışan bir worklet. Jest callback'lerinden doğrudan
   * çağırabilelim diye useCallback'e sarmadım.
   */
  const playHarvest = () => {
    'worklet';
    liftY.value = withTiming(-52, {
      duration: durations.slow,
      easing: easings.out,
    });
    cardScale.value = withSequence(
      withTiming(1.18, { duration: durations.fast, easing: easings.out }),
      withTiming(0, { duration: durations.base, easing: easings.in }),
    );
    cardOpacity.value = withTiming(0, { duration: durations.slow }, (finished) => {
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
      // Otlar kaydırdıkça soluyor, geri bildirim anında olsun.
      weedOpacity.value = Math.max(
        0,
        1 - Math.abs(event.translationX) / CLEAR_DISTANCE,
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) < CLEAR_DISTANCE) {
        weedX.value = withSpring(0, springs.settle);
        weedOpacity.value = withTiming(1, { duration: durations.base });
        return;
      }
      const direction = event.translationX > 0 ? 1 : -1;
      weedX.value = withTiming(direction * 280, {
        duration: durations.slow,
        easing: easings.in,
      });
      weedOpacity.value = withTiming(0, { duration: durations.base }, (finished) => {
        if (finished) runOnJS(handleTend)();
      });
      cardScale.value = withSequence(
        withTiming(1.07, { duration: durations.fast, easing: easings.out }),
        withSpring(1, springs.enter),
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
      liftY.value = withSpring(0, springs.settle);
      cardScale.value = withSpring(1, springs.settle);
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
        // Otlu not açılmıyor, reddettiğimizi animasyonla söylüyoruz.
        // Sallanma adımı fast'in yarısı, tereddütsüz dursun.
        const step = durations.fast / 2;
        shakeX.value = withSequence(
          withTiming(-7, { duration: step }),
          withTiming(7, { duration: step }),
          withTiming(-4, { duration: step }),
          withTiming(0, { duration: step }),
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

  /**
   * Parıltı toprağa vuran bir hale. Komple altın bir leke olmasın diye opaklık
   * dar bir aralıkta geziyor.
   */
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.22,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.card, { width: size, height: size }, cardStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${note.title}, ${visual.label}`}
        accessibilityHint={visual.hint}
      >
        {/* kapak kısmı, bitki burada duruyor */}
        <View
          style={[
            styles.cover,
            styles.noHit,
            { height: cover, backgroundColor: stages[stage].cover },
          ]}
        >
          <Animated.View
            style={[
              styles.glow,
              glowStyle,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                bottom: -Math.round(glowSize * 0.45),
              },
            ]}
          />
          <View
            style={[
              styles.mound,
              {
                width: Math.round(size * 0.46),
                height: moundHeight,
                borderTopLeftRadius: moundHeight,
                borderTopRightRadius: moundHeight,
              },
            ]}
          />
          <View style={[styles.plant, { bottom: Math.round(moundHeight * 0.4) }]}>
            <LivingPlant
              stage={stage}
              progress={progress}
              height={plantBox}
              seed={note.seed_type}
            />
          </View>
          <Text style={styles.seedBadge}>{seed?.emoji ?? '🌾'}</Text>
        </View>

        <View style={[styles.body, styles.noHit]}>
          <Text
            style={styles.title}
            numberOfLines={2}
            maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
          >
            {note.title}
          </Text>
          <View style={styles.metaRow}>
            {isHarvestable ? (
              <View style={styles.hint}>
                <Icon name="arrow-up" size={12} color={stages.harvestable.accent} />
                <Text
                  style={[styles.hintText, { color: stages.harvestable.accent }]}
                  maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
                >
                  Hasat et
                </Text>
              </View>
            ) : (
              <Tag label={visual.label} color={stages[stage].tag} />
            )}
            {labor && labor.total > 0 ? (
              <View style={styles.hint}>
                <Icon name="check-square" size={12} color={colors.textMuted} />
                <Text style={styles.labor} maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}>
                  {labor.done}/{labor.total}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/*
          Ot katmanı. Kaydırdıkça kayıyor ve soluyor, hep ekranda duruyor.
          Ot yokken ekran okuyucudan da gizliyoruz, yoksa sağlam kartta da
          "ot bastı" diye okuyordu.
        */}
        <Animated.View
          accessibilityElementsHidden={!isWeedy}
          importantForAccessibility={isWeedy ? 'auto' : 'no-hide-descendants'}
          style={[
            styles.weedLayer,
            weedStyle,
            { pointerEvents: isWeedy ? 'auto' : 'none' },
          ]}
        >
          <View style={[styles.weedRow, { height: cover }]}>
            <Text style={{ fontSize: Math.round(size * 0.18) }}>🥀</Text>
            <Text style={{ fontSize: Math.round(size * 0.14), opacity: 0.8 }}>
              🌿
            </Text>
            <Text style={{ fontSize: Math.round(size * 0.18) }}>🥀</Text>
          </View>
          <View style={styles.body}>
            <Text
              style={styles.weedTitle}
              numberOfLines={2}
              maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
            >
              {note.title}
            </Text>
            <View style={styles.hint}>
              <Icon name="move" size={12} color={colors.leafLight} />
              <Text style={styles.weedHint} maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}>
                Temizlemek için kaydır
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export const NoteCard = React.memo(NoteCardComponent);

const useStyles = makeStyles(({ colors, elevation }) => ({
  card: {
    overflow: 'hidden',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.card,
    ...elevation.card,
  },
  /** Süs katmanları jestleri yakalamasın. */
  noHit: { pointerEvents: 'none' },
  cover: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.goldLight,
  },
  mound: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: colors.soilLight,
    opacity: 0.35,
  },
  plant: { position: 'absolute', alignSelf: 'center' },
  // tohum emojisi sol üst köşede
  seedBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    fontSize: 14,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  title: { ...typography.ui, fontSize: 13, lineHeight: 18, color: colors.textPrimary },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { ...typography.caption, fontWeight: '600' },
  labor: { ...typography.caption, color: colors.textMuted },
  weedLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.weedDeep,
  },
  weedRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    paddingBottom: spacing.xs,
  },
  weedTitle: { ...typography.ui, fontSize: 13, lineHeight: 18, color: colors.textOnDark },
  weedHint: { ...typography.caption, color: colors.leafLight },
}));
